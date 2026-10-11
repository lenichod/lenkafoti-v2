import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react(), {
    name: 'admin-development-csp',
    apply: 'serve',
    // Vite injects an inline React refresh preamble in development only.
    // Production keeps the restrictive script policy in admin/index.html.
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*\/>/, ''),
    },
  }],
  base: process.env.VITE_BASE_PATH || '/',
  build: {
    rollupOptions: {
      input: {
        portfolio: fileURLToPath(new URL('./index.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin/index.html', import.meta.url)),
      },
    },
  },
  server: {
    host: 'localhost',
    open: process.env.VITE_OPEN_BROWSER !== 'false',
  },
  preview: {
    host: 'localhost',
  },
});
