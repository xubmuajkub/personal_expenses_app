'use strict';

const { withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const TARGET = 'PersonalExpensesShare';
const BUNDLE = 'online.dolemi.peapp.share';

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
    for (const f of ['Info.plist', 'ShareViewController.swift']) {
      fs.copyFileSync(path.join(tpl, f), path.join(targetPath, f));
    }

    const existing = project.pbxTargetByName(TARGET);
    if (!existing) {
      const newTarget = project.addTarget(TARGET, 'app_extension', TARGET, BUNDLE);
      const targetKey = newTarget.uuid;
      project.addBuildPhase(
        [`${TARGET}/ShareViewController.swift`],
        'PBXSourcesBuildPhase',
        'Sources',
        targetKey,
      );
      project.addPbxGroup(
        [
          `${TARGET}/Info.plist`,
          `${TARGET}/ShareViewController.swift`,
        ],
        TARGET,
        TARGET,
      );

      const configurations = project.pbxXCBuildConfigurationSection();
      for (const key in configurations) {
        const conf = configurations[key];
        if (typeof conf.buildSettings !== 'undefined' &&
            conf.buildSettings.PRODUCT_NAME === `"${TARGET}"`) {
          conf.buildSettings.SWIFT_VERSION = '5.0';
          conf.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '15.1';
          conf.buildSettings.INFOPLIST_FILE = `"${TARGET}/Info.plist"`;
          conf.buildSettings.LD_RUNPATH_SEARCH_PATHS =
            '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
          conf.buildSettings.CODE_SIGN_STYLE = 'Automatic';
          conf.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
        }
      }
    }

    return cfg;
  });

  return config;
};
