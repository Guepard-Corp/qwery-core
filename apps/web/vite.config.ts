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
      '/api/ping': {
        target: process.env.VITE_LOCAL_AGENT_URL || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/test-connection': {
        target: process.env.VITE_LOCAL_AGENT_URL || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/query': {
        target: process.env.VITE_LOCAL_AGENT_URL || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      external: ['fsevents'],
    },
  },
  optimizeDeps: {
    exclude: ['fsevents', '@electric-sql/pglite'],
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