import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  splitting: false,
  sourcemap: true,
  minify: false,
  clean: true,
  treeshake: true,
  keepNames: true,
  platform: 'node',
  dts: false,
  external: [
    'react',
    'react-dom',
    '@duckdb/node-api',
    '@duckdb/node-bindings-linux-arm64',
    '@duckdb/node-bindings-darwin-arm64',
    '@duckdb/node-bindings-darwin-x64',
    '@duckdb/node-bindings-win32-x64',

    // Externalize all OpenTelemetry packages to avoid ESM bundling issues
    /^@opentelemetry\/.*/,
    // Externalize gRPC packages to avoid ESM bundling issues
    '@grpc/grpc-js',
  ],
  noExternal: [/^@qwery\/.*$/],
});

