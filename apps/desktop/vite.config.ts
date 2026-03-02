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
            } else if (url.endsWith('.svg')) {
              res.setHeader('Content-Type', 'image/svg+xml');
            } else if (url.endsWith('.png')) {
              res.setHeader('Content-Type', 'image/png');
            } else if (url.endsWith('.jpg') || url.endsWith('.jpeg')) {
              res.setHeader('Content-Type', 'image/jpeg');
            } else if (url.endsWith('.webp')) {
              res.setHeader('Content-Type', 'image/webp');
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
    fs: {
      // Allow serving files from the monorepo root (usually two levels up)
      allow: ['../../'],
    },
    port: 1420,
    strictPort: true,
    host: host || false,
    proxy: {
      '/api': {
        target: 'http://localhost:4096',
        changeOrigin: true,
      },
      '/qwery': {
        target: 'http://localhost:4096',
        changeOrigin: true,
      },
    },
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri` and build artifacts
      ignored: ["**/src-tauri/**", "**/target/**"],
    },
  },
  optimizeDeps: {
    // Force a deep scan of both apps on boot
    entries: [
      "./app/root.tsx",
      "../web/app/routes/**/*.{ts,tsx}",
    ],
    holdUntilCrawlEnd: true,
    // Exclude heavy node/binary deps from optimization
    exclude: [
      "@electric-sql/pglite",
      "@duckdb/duckdb-wasm",
      "fsevents",
    ],
    // Only include packages that Vite consistently misses
    include: [
      "react-hook-form",
      "zod",
      "@radix-ui/react-context-menu",
      "recharts",
    ],
  },
  build: {
    sourcemap: false,
    manifest: true,
    worker: {
      format: 'es',
    },
    rollupOptions: {
      onwarn(warning, warn) {
        if (
          typeof warning.message === 'string' &&
          warning.message.includes('sourcemap')
        ) {
          return;
        }
        warn(warning);
      },
    },
  },
}));
