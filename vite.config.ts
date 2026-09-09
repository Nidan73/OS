/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    target: 'esnext'
  },
  server: {
    port: 3000
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/.wt/**', '**/cypress/**', '**/.{idea,git,cache,output,temp}/**']
  }
});
