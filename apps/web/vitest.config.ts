import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  test: {
    clearMocks: true,
    coverage: {
      provider: 'istanbul',
      exclude: [
        ...coverageConfigDefaults.exclude,
        '__mocks__',
        'config',
        'server',
        '**/**stories**',
      ],
      reporter: 'lcovonly',
    },
    environment: 'jsdom',
    setupFiles: [
      '__tests__/globals.ts',
      '__tests__/globalsProviders.tsx',
      'setupTests.ts',
    ],
    globals: true,
    include: ['__tests__/**/*.test.{ts,tsx}'],
    exclude: [
      // Common test Utils
      '__tests__/utils',

      // Test Setup files
      '__tests__/globals.ts',
      '__tests__/globalsProviders.tsx',

      // Testing artifacts
      '**/__snapshots__/**',
    ],
    server: {
      deps: {
        inline: ['@qwery/ui', 'react', 'react-dom'],
      },
    },
    pool: 'vmThreads',
  },
});
