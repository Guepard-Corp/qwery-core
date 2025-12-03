import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { mergeConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const config: StorybookConfig = {
  stories: [
    '../../../packages/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../../../apps/**/*.stories.@(js|jsx|ts|tsx|mdx)',
  ],
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
      plugins: [react(), tsconfigPaths(), tailwindcss()],
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
