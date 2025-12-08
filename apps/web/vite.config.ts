import { reactRouter } from '@react-router/dev/vite';
import { defineConfig, type Plugin } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import tsconfigPaths from 'vite-tsconfig-paths';

import tailwindCssVitePlugin from '@qwery/tailwind-config/vite';

// Plugin to set correct MIME type for WASM files
function wasmMimeTypePlugin(): Plugin {
  return {
    name: 'wasm-mime-type',
    enforce: 'pre', // Run before other plugins to set headers early
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';

        // Handle WASM files with correct MIME type
        if (url.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        }

        // Handle worker files with correct MIME type
        if (url.endsWith('.worker.js') || url.includes('.worker.')) {
          res.setHeader('Content-Type', 'application/javascript');
        }

        // Handle source map files
        if (url.endsWith('.map')) {
          res.setHeader('Content-Type', 'application/json');
        }

        next();
      });
    },
  };
}

const ALLOWED_HOSTS =
  process.env.NODE_ENV === 'development' ? ['host.docker.internal'] : [];

export default defineConfig(({ command }) => ({
  ssr: {
    noExternal:
      command === 'build'
        ? true
        : ['posthog-js', '@posthog/react', 'streamdown'],
    external: [
      'better-sqlite3',
      '@duckdb/node-api',
      '@duckdb/node-bindings-linux-arm64',
      '@duckdb/node-bindings-linux-x64',
      '@duckdb/node-bindings-darwin-arm64',
      '@duckdb/node-bindings-darwin-x64',
      '@duckdb/node-bindings-win32-x64',
    ],
  },
  plugins: [
    wasmMimeTypePlugin(), // Must run early to set MIME types before other plugins
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
    manifest: true, // Enable manifest generation for React Router
    rollupOptions: {
      external: (id: string) => {
        if (id === 'fsevents') return true;
        if (id === 'better-sqlite3') return true;
        if (id === '@duckdb/node-api') return true;
        if (id.startsWith('@duckdb/node-bindings')) return true;
        if (id.includes('@duckdb/node-bindings') && id.endsWith('.node')) {
          return true;
        }
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
      '@duckdb/duckdb-wasm',
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
