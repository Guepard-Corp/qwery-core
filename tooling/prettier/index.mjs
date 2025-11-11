/** @typedef  {import('prettier').Config} PrettierConfig */
/** @typedef  {import('@trivago/prettier-plugin-sort-imports').PluginConfig} SortImportsConfig */

/** @type { PrettierConfig | SortImportsConfig } */
const config = {
  tabWidth: 2,
  useTabs: false,
  semi: true,
  printWidth: 80,
  singleQuote: true,
  arrowParens: 'always',
  importOrder: [
    '/^(?!.*\\.css).*/',
    '^server-only$',
    '^react$',
    '^react-dom$',
    '^react-router$', // react-router
    '^@react-router$', // react-router
    '<THIRD_PARTY_MODULES>',
    '^@qwery/(.*)$', // package imports
    '^~/(.*)$', // app-specific imports
    '^[./]', // relative imports
  ],
  tailwindFunctions: ['tw', 'clsx', 'cn'],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  plugins: [
    '@trivago/prettier-plugin-sort-imports',
    'prettier-plugin-tailwindcss',
  ],
  overrides: [
    {
      files: '*.ts',
      options: {
        parser: 'babel-ts',
        plugins: [
          '@trivago/prettier-plugin-sort-imports',
          'prettier-plugin-tailwindcss',
        ],
      },
    },
    {
      files: '*.tsx',
      options: {
        parser: 'babel-ts',
        plugins: [
          '@trivago/prettier-plugin-sort-imports',
          'prettier-plugin-tailwindcss',
        ],
      },
    },
  ],
};

export default config;
