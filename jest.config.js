module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/_mock\\.ts$'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-modules-core|@unimodules/.*|sentry-expo|native-base|react-clone-referenced-element|@react-native-community/.*|@supabase/.*)',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
};
