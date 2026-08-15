import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';

process.env.NODE_ENV = 'test';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), '.'),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['server.ts', 'store.ts', 'fieldClassifier.ts', 'qaRetrieval.ts', 'src/**/*.{ts,tsx}'],
      exclude: ['src/types.ts', 'src/main.tsx', 'src/extensionSource.ts'],
      thresholds: {
        'server.ts': { lines: 70, functions: 70, statements: 70, branches: 65 },
        'src/**': { lines: 60, functions: 40, statements: 60, branches: 58 },
      },
    },
  },
});
