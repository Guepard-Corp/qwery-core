import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import path from 'path';

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
    },
    globals: true,
    browser: {
      enabled: true,
      headless: false,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    testTimeout: 300000, // 5 minutes for model loading and inference
    hookTimeout: 300000,
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
    },
  },
});
