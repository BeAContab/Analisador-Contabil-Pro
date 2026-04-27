import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/Analisador-Contabil-Pro/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173
  }
});
