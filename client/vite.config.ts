import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  root: __dirname,
  build: {
    outDir: path.resolve(__dirname, "..", "dist", "public"),
    emptyOutDir: true,
    sourcemap: false,
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
  define: {
    // Передаем environment variables в frontend
    'import.meta.env.VITE_APP_DOMAIN': JSON.stringify(process.env.APP_DOMAIN || process.env.VITE_APP_DOMAIN),
    'import.meta.env.VITE_TELEGRAM_BOT_USERNAME': JSON.stringify(process.env.TELEGRAM_BOT_USERNAME || process.env.VITE_TELEGRAM_BOT_USERNAME),
    'import.meta.env.VITE_TELEGRAM_WEBAPP_NAME': JSON.stringify(process.env.TELEGRAM_WEBAPP_NAME || process.env.VITE_TELEGRAM_WEBAPP_NAME),
  }
});