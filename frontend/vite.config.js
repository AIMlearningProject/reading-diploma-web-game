import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: "all", 
    host: '0.0.0.0',
    proxy: {
      '/uploads': 'http://localhost:3001',
      '/api': 'http://localhost:3001',
      '/auth': 'http://localhost:3001',
    },
  },
}); 
