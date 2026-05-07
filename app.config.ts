import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'personal-expenses',
  slug: 'personal-expenses',
  scheme: 'personalexpenses',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  // @ts-expect-error newArchEnabled is valid at runtime but not yet in @expo/config-types for SDK 55
  newArchEnabled: true,
  ios: { supportsTablet: true, bundleIdentifier: 'la.personalexpenses.app' },
  android: { package: 'la.personalexpenses.app' },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-notifications',
    'expo-secure-store',
    ['expo-font', { fonts: ['./assets/fonts/Geist-Variable.ttf'] }],
  ],
};

export default config;
