import { defineConfig, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Every backend is reached through the dev server, so the browser only talks to one origin
 * and no backend needs CORS changes. The Origin header is dropped because Coverage rejects
 * origins outside its allow-list.
 */
function service(target: string, prefix: string): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    rewrite: (path) => path.replace(new RegExp(`^${prefix}`), ''),
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
    },
  };
}

const proxy: Record<string, ProxyOptions> = {
  '/svc/coverage': service('http://127.0.0.1:8081', '/svc/coverage'),
  '/svc/orders': service('http://127.0.0.1:8082', '/svc/orders'),
  '/svc/notifications': service('http://127.0.0.1:8033', '/svc/notifications'),
  '/svc/geo': service('https://api-colombia.com/api/v1', '/svc/geo'),
};

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
});
