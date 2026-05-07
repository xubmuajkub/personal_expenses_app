module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { project: './tsconfig.json' },
  plugins: ['@typescript-eslint', 'react', 'react-native'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-native/all',
    'prettier',
  ],
  env: { 'react-native/react-native': true, jest: true, node: true, es2022: true },
  settings: { react: { version: 'detect' } },
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    // 'plugin:react-native/all' enables a wide net; turn off the most opinionated
    // rules so tooling does not drive source-level decisions. Color and font
    // discipline is enforced by the design-tokens module (src/ui/theme.ts) and
    // by code review, not by ESLint.
    'react-native/no-color-literals': 'off',
    'react-native/no-inline-styles': 'off',
    'react-native/sort-styles': 'off',
    'react-native/no-raw-text': 'off',
  },
  ignorePatterns: ['node_modules', 'android', 'ios', 'dist', '.expo', 'coverage', '__mocks__', '*.config.js', '*.config.cjs', 'babel.config.js', 'metro.config.js', 'supabase/functions'],
  overrides: [
    {
      // Test files use require() inside test bodies for jest.resetModules() isolation.
      files: ['__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
      rules: { '@typescript-eslint/no-require-imports': 'off' },
    },
    {
      // Expo config plugins are CommonJS modules; require() is expected.
      // They are excluded from tsconfig so we must disable project-based parsing.
      files: ['plugins/**/*.js'],
      parserOptions: { project: null },
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
      },
    },
  ],
};
