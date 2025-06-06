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
    port: 3000
  },
  optimizeDeps: {
    include: ['@types/node']
  },
  define: {
    // 'process.env': process.env // Удалено ради безопасности
  }
});
