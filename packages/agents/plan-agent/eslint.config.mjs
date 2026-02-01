import eslintConfigBase from '@qwery/eslint-config/base.js';

export default [
  ...eslintConfigBase,
  {
    ignores: ['**/*.js', '**/*.js.map'],
  },
];
