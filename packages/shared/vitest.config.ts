import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/validators/**/*.ts'],
      exclude: ['**/*.test.ts', 'node_modules'],
    },
  },
  resolve: {
    alias: {
      '@nexgent/shared': resolve(__dirname, './src/index.ts'),
      '@nexgent/shared/': resolve(__dirname, './src/'),
    },
  },
});
