import type { ExpoConfig } from 'expo/config';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withShareExtension = require('./plugins/with-share-extension');

// ExpoConfig.plugins types only allow strings/tuples; function plugins are valid
// at runtime but not in the type definition. Cast to bypass.
type ExpoConfigWithPluginFns = Omit<ExpoConfig, 'plugins' | 'newArchEnabled'> & {
  newArchEnabled?: boolean;
  plugins?: unknown[];
};

const config: ExpoConfigWithPluginFns = {
  name: 'personal-expenses',
  slug: 'personal-expenses',
  scheme: 'personalexpenses',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: { supportsTablet: true, bundleIdentifier: 'la.personalexpenses.app' },
  android: { package: 'la.personalexpenses.app' },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-notifications',
    'expo-secure-store',
    ['expo-font', { fonts: ['./assets/fonts/Geist-Variable.ttf'] }],
    withShareExtension,
  ],
};

export default config;
