import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, type Plugin } from 'vite';
import tailwindCssVitePlugin from '@qwery/tailwind-config/vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import tsconfigPaths from 'vite-tsconfig-paths';
import topLevelAwait from 'vite-plugin-top-level-await';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const gitHash = execSync('git rev-parse --short HEAD').toString().trim();

// Plugin to set correct MIME type for extension drivers (WASM, JS, etc.)
function extensionsMimeTypePlugin(): Plugin {
  return {
    name: 'extensions-mime-type',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        if (url.startsWith('/extensions/')) {
          try {
            const publicDir = path.resolve(process.cwd(), 'public');
            const filePath = path.join(publicDir, url);
            if (url.endsWith('.js')) {
              res.setHeader('Content-Type', 'application/javascript');
            } else if (url.endsWith('.wasm')) {
              res.setHeader('Content-Type', 'application/wasm');
            } else if (url.endsWith('.data')) {
              res.setHeader('Content-Type', 'application/octet-stream');
            } else if (url.endsWith('.json')) {
              res.setHeader('Content-Type', 'application/json');
            }
            const fileContent = fs.readFileSync(filePath);
            res.end(fileContent);
            return;
          } catch {
            // File doesn't exist - continue to next middleware
          }
        }
        next();
      });
    },
  };
}

// Polyfill require() in ESM for deps that use it (e.g. turndown -> @mixmark-io/domino)
function requirePolyfillPlugin(): Plugin {
  return {
    name: 'replace-domino-require',
    enforce: 'pre',
    transform(code, id) {
      if (!id || !id.includes('node_modules/turndown')) return null;
      const pattern = /require\(['"]@mixmark-io\/domino['"]\)/g;
      if (pattern.test(code)) {
        const replaced = code.replace(pattern, 'undefined');
        return { code: replaced, map: null };
      }
      return null;
    },
  };
}

// https://vite.dev/config/
export default defineConfig(async () => ({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
    'import.meta.env.VITE_GIT_HASH': JSON.stringify(gitHash),
  },
  plugins: [
    extensionsMimeTypePlugin(),
    reactRouter(),
    devtoolsJson(),
    tsconfigPaths(),
    requirePolyfillPlugin(),
    ...tailwindCssVitePlugin.plugins,
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    sourcemap: false, // Disable sourcemaps to avoid resolution errors in monorepo
    manifest: true, // Enable manifest generation for React Router

  optimizeDeps: {
    exclude: [
      'fsevents',
      '@electric-sql/pglite',
      '@duckdb/node-api',
      '@duckdb/duckdb-wasm',
      '@qwery/agent-factory-sdk',
    ],
    include: [
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/commands',
      '@codemirror/language',
      '@codemirror/lang-sql',
      '@codemirror/theme-one-dark',
      '@uiw/react-codemirror',
      'i18next',
      'react-i18next',
      'ai',
    ],
    entries: [
      './app/root.tsx',
      './app/routes/**/*.tsx',
    ],
    worker: {
      format: 'es',
    },
  },
  },
}));
