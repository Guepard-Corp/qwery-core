import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import tsconfigPaths from 'vite-tsconfig-paths';

import tailwindCssVitePlugin from '@qwery/tailwind-config/vite';

const ALLOWED_HOSTS =
  process.env.NODE_ENV === 'development' ? ['host.docker.internal'] : [];

export default defineConfig(({ command }) => ({
  ssr: {
    noExternal:
      command === 'build'
        ? true
        : ['posthog-js', '@posthog/react', 'streamdown'],
    external: ['better-sqlite3', '@duckdb/node-api'],
  },
  plugins: [
    devtoolsJson(),
    reactRouter(),
    tsconfigPaths(),
    ...tailwindCssVitePlugin.plugins,
  ],
  server: {
    port: 3000,
    allowedHosts: ALLOWED_HOSTS,
    proxy: {
      // Proxy specific agent API routes to the query agent service
      //'/api': {
      //  target: process.env.VITE_LOCAL_AGENT_URL || 'http://localhost:8000',
      //  changeOrigin: true,
      //},
    },
  },
  build: {
    rollupOptions: {
      external: (id: string) => {
        if (id === 'fsevents') return true;
        if (id === 'better-sqlite3') return true;
        if (id === '@duckdb/node-api') return true;
        if (id.startsWith('node:')) return true;
        return false;
      },
    },
  },
  optimizeDeps: {
    exclude: [
      'fsevents',
      '@electric-sql/pglite',
      '@duckdb/node-api',
      '@qwery/agent-factory-sdk',
    ],
    entries: [
      './app/root.tsx',
      './app/entry.server.tsx',
      './app/routes/**/*.tsx',
    ],
    worker: {
      format: 'es',
    },
  },
}));
