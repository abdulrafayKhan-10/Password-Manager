import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-extension-assets',
      closeBundle() {
        // Copy manifest.json to dist
        copyFileSync(
          resolve(__dirname, 'manifest.json'),
          resolve(__dirname, 'dist/manifest.json')
        );

        // Copy icons from the Tauri icons folder
        mkdirSync(resolve(__dirname, 'dist/icons'), { recursive: true });
        copyFileSync(
          resolve(__dirname, '../src-tauri/icons/16x16.png'),
          resolve(__dirname, 'dist/icons/icon16.png')
        );
        copyFileSync(
          resolve(__dirname, '../src-tauri/icons/48x48.png'),
          resolve(__dirname, 'dist/icons/icon48.png')
        );
        copyFileSync(
          resolve(__dirname, '../src-tauri/icons/128x128.png'),
          resolve(__dirname, 'dist/icons/icon128.png')
        );

        console.log('[extension] manifest.json and icons copied to dist/');
      },
    },
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
});
