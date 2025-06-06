import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, './src'),
      "@modules": path.resolve(__dirname, './src/modules'),
      "@core": path.resolve(__dirname, './src/core'),
      "@shared": path.resolve(__dirname, './src/shared'),
      "@pages": path.resolve(__dirname, './src/pages')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: [
      'localhost',
      '.replit.dev',
      '.replit.co', 
      '.replit.app',
      '.sisko.replit.dev',
      'b5a0c2c0-8ae5-4c76-805d-b6526b5c71bf-00-3g55kazsjo72c.sisko.replit.dev'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },

  define: {
    // 'process.env': process.env // Удалено ради безопасности
  }
});