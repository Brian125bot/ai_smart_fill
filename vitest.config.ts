import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';

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
      include: ['server.ts', 'src/**/*.{ts,tsx}'],
      exclude: ['src/types.ts', 'src/main.tsx', 'src/extensionSource.ts'],
      thresholds: {
        'server.ts': { lines: 80, functions: 80, statements: 80, branches: 70 },
        'src/**': { lines: 60, functions: 40, statements: 60, branches: 58 },
      },
    },
  },
});
