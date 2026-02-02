import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['__tests__/**/*.test.ts'],
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
  },
});
