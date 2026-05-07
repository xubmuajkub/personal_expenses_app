'use strict';

const { withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const TARGET = 'PersonalExpensesShare';
const BUNDLE = 'la.personalexpenses.app.share';

/**
 * Expo config plugin that adds the PersonalExpensesShare iOS share extension target.
 *
 * NOTE: The withInfoPlist call from the plan has been intentionally omitted.
 * NSExtensionActivationRule belongs in the extension's own Info.plist (already
 * included in share-extension-template/Info.plist), not the host app's plist.
 *
 * After adding this plugin, run `npx expo prebuild --clean` and open the iOS
 * workspace in Xcode to let Xcode finalize the storyboard.
 */
module.exports = function withShareExtension(config) {
  config = withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const targetPath = path.join(cfg.modRequest.platformProjectRoot, TARGET);

    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }

    const tpl = path.join(__dirname, 'share-extension-template');
    for (const f of ['Info.plist', 'ShareViewController.swift', 'MainInterface.storyboard']) {
      fs.copyFileSync(path.join(tpl, f), path.join(targetPath, f));
    }

    const existing = project.pbxTargetByName(TARGET);
    if (!existing) {
      project.addTarget(TARGET, 'app_extension', TARGET, BUNDLE);
      const targetKey = project.findTargetKey(TARGET);
      project.addBuildPhase(
        ['MainInterface.storyboard'],
        'PBXResourcesBuildPhase',
        'Resources',
        targetKey,
      );
      project.addBuildPhase(
        ['ShareViewController.swift'],
        'PBXSourcesBuildPhase',
        'Sources',
        targetKey,
      );
      project.addPbxGroup(
        ['Info.plist', 'ShareViewController.swift', 'MainInterface.storyboard'],
        TARGET,
        TARGET,
      );
    }

    return cfg;
  });

  return config;
};
