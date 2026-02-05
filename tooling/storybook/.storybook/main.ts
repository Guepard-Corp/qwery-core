import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { mergeConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import tsconfigPaths from 'vite-tsconfig-paths';

const config: StorybookConfig = {
  stories: ['../../../packages/ui/src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      plugins: [react(), wasm(), topLevelAwait(), tsconfigPaths(), tailwindcss()],
      esbuild: {
        jsx: 'automatic',
      },
      ssr: {
        external: [
          '@duckdb/node-api',
          '@duckdb/node-bindings-win32-x64',
          '@duckdb/node-bindings-darwin-x64',
          '@duckdb/node-bindings-linux-x64',
        ],
      },
      build: {
        rollupOptions: {
          external: (id: string) => {
            if (id === 'better-sqlite3') return true;
            if (id === '@duckdb/node-api') return true;
            if (id.startsWith('@duckdb/node-bindings')) return true;
            if (id.startsWith('node:')) return true;
            return false;
          },
        },
      },
      optimizeDeps: {
        exclude: [
          '@duckdb/node-api',
          '@duckdb/node-bindings-win32-x64',
          '@duckdb/node-bindings-darwin-x64',
          '@duckdb/node-bindings-linux-x64',
          '@qwery/extension-clickhouse-node',
          '@qwery/extension-clickhouse-web',
          '@qwery/extension-duckdb',
          '@qwery/extension-duckdb-wasm',
          '@qwery/extension-pglite',
          '@qwery/extension-mysql',
          '@qwery/extension-postgresql',
          '@qwery/extension-json-online',
          '@qwery/extension-gsheet-csv',
          '@qwery/extension-parquet-online',
          '@qwery/extension-youtube-data-api-v3',
        ],
      },
    });
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) =>
        prop.parent ? !/node_modules/.test(prop.parent.fileName) : true,
    },
  },
};

export default config;
