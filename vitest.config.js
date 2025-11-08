import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup/phaserStub.js'],
    include: ['tests/**/*.spec.js'],
    exclude: ['tests/e2e/**/*'],
    coverage: {
      provider: 'v8',
      reports: ['text', 'lcov', 'json-summary'],
      thresholds: {
        statements: 90,
        branches: 70,
        functions: 89,
        lines: 90
      }
    }
  }
});
