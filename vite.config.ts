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
  /** Plain `localhost` has no subdomain — use this for injected Host (must match backend tenant). */
  const devSlug = env.VITE_DEV_TENANT_SLUG?.trim();
  const apiTarget = 'http://localhost:3000';
  const fallbackTenantHost = `${devSlug}.localhost:3000`;

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
              // Match Postman: Host must be `{slug}.localhost:3000` for the tenant you're on.
              // Browser sends e.g. `downtown.localhost:5173` — rewrite port to backend :3000.
              const raw = req.headers.host ?? '';
              const hostNoPort = raw.replace(/:\d+$/, '');
              const isBareLocal =
                hostNoPort === 'localhost' || hostNoPort === '127.0.0.1';
              const hostHeader = isBareLocal
                ? fallbackTenantHost
                : `${hostNoPort}:3000`;
              proxyReq.setHeader('Host', hostHeader);
            });
          },
        },
      },
    },
  };
});
