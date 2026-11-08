import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ command }) => {
  const base =
    process.env.VITE_BASE ||
    (command === 'serve' ? '/' : '/sparta-clo/');

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/pathao-proxy-live': {
          target: 'https://api-hermes.pathao.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/pathao-proxy-live/, ''),
          secure: true,
        },
        '/pathao-proxy-sandbox': {
          target: 'https://courier-api-sandbox.pathao.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/pathao-proxy-sandbox/, ''),
          secure: true,
        },
      },
    },
  };
});
