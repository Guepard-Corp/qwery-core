import baseConfig from '@qwery/eslint-config/base.js';

export default [
  ...baseConfig,
  {
    files: ['src/**/*.{ts,tsx}', '__tests__/**/*.ts'],
    rules: {
      'react/no-unknown-property': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },
];
