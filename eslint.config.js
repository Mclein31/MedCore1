import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.wrangler/**',
      'MedCore_Vault/**',
      'docs/**',
      'logo/**',
      'UI_SCREENSHOTS/**',
      '.agents/**',
      '.claude/**',
      'product video inspo/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message:
            'Never put credentials or patient data in localStorage. Sessions live in HttpOnly cookies.',
        },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'localStorage', message: 'Sessions live in HttpOnly cookies.' },
      ],
    },
  },
  {
    files: ['apps/web/src/v1/**/*.{ts,tsx}'],
    rules: {
      ...Object.fromEntries(Object.keys(reactHooks.configs.recommended.rules).map((name) => [name, 'off'])),
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['apps/mobile/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // The app is the original v1 UI ported onto v2: classic hook rules, not the React Compiler set
      // (its ref-in-render rules would force rewriting working v1 components).
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      // Metro bundles images through require(); nothing else may use it.
      '@typescript-eslint/no-require-imports': ['error', { allow: ['\\.png$'] }],
      'no-restricted-imports': [
        'error',
        {
          name: '@react-native-async-storage/async-storage',
          message:
            'Never put the session or patient data in AsyncStorage. The token lives in expo-secure-store.',
        },
      ],
    },
  },
  {
    // Non-sensitive UI flags only (onboarding seen, notifications read).
    files: [
      'apps/mobile/src/hooks/useOnboarding.ts',
      'apps/mobile/src/hooks/useUnread.ts',
      'apps/mobile/src/screens/NotificationsScreen.tsx',
    ],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['apps/mobile/metro.config.js'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
