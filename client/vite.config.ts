import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "..", "shared"),
      "@assets": path.resolve(__dirname, "..", "attached_assets"),
      "@types": path.resolve(__dirname, "..", "types"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '^/api/.*': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
      '^/health$': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  root: __dirname,
  build: {
    outDir: path.resolve(__dirname, "..", "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      external: (id) => {
        // Исключаем проблемные пути из сборки
        return id.includes("book-copy.js") || id.includes("clipboard-copy.js");
      },
    },
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
});