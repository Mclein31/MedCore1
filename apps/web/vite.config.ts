import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The API is always reached as same-origin /api (proxied here in dev, rewritten by
// the host in production), so session cookies stay first-party and SameSite=Strict.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': { target: `http://127.0.0.1:${process.env.API_PORT ?? '8787'}`, changeOrigin: false } },
  },
  build: { sourcemap: false },
});
