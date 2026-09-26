import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: { manualChunks: (id: string) => id.includes('/phaser/') ? 'phaser' : undefined },
    },
  },
});
