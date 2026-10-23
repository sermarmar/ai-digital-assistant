import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// /api se redirige al servicio api: el navegador solo habla con un origen y no hace falta CORS
const apiUrl = process.env.API_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: apiUrl, rewrite: (path) => path.replace(/^\/api/, '') },
    },
  },
});
