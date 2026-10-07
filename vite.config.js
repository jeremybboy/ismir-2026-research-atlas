import { defineConfig } from 'vite';
import { copyFile, cp, mkdir } from 'node:fs/promises';

export default defineConfig({
  base: '/ismir-2026-research-atlas/',
  plugins: [{
    name: 'copy-reviewed-data',
    async writeBundle() {
      await mkdir('dist/data', { recursive: true });
      await cp('data', 'dist/data', { recursive: true });
      await copyFile('llms.txt', 'dist/llms.txt');
    },
  }],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
