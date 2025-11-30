import baseConfig from '@qwery/eslint-config/base.js';

export default [
  ...baseConfig,
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
];

