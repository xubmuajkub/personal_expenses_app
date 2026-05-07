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
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#FAF4F4',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'la.personalexpenses.app',
    buildNumber: '1',
  },
  android: {
    package: 'la.personalexpenses.app',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FAF4F4',
    },
  },
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
