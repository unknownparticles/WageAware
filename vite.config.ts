import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 'base' is critical for GitHub Pages if the site is not at the domain root
  base: './',
  build: {
    outDir: 'docs',
    assetsDir: 'assets',
    sourcemap: false
  },
  server: {
    port: 3000
  }
});