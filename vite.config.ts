import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devSlug = env.VITE_DEV_TENANT_SLUG?.trim();
  const apiTarget = 'http://localhost:3000';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const raw = req.headers.host ?? '';
              const hostNoPort = raw.replace(/:\d+$/, '');
              const isBareLocal =
                hostNoPort === 'localhost' || hostNoPort === '127.0.0.1';

              // Extract tenant slug from the browser hostname or fall back to env default
              const slug = isBareLocal ? devSlug : hostNoPort.split('.')[0];

              if (slug) {
                proxyReq.setHeader('X-Tenant-Slug', slug);
              }
            });
          },
        },
      },
    },
  };
});
