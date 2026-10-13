import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    hmr: {
      clientPort: 443,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/v2': {
        target: 'http://localhost:8088',
        changeOrigin: true,
      },
      '/mock/v2': {
        target: 'http://localhost:8088',
        changeOrigin: true,
      },
    },
  },
});
