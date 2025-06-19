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
      "lucide-react": path.resolve(__dirname, "src", "lib", "lucide-fallback.ts"),
    },
  },
  root: __dirname,
  build: {
    outDir: path.resolve(__dirname, "..", "dist", "public"),
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
    include: ["react", "react-dom"]
  },

  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  define: {
    // Передаем environment variables в frontend
    'import.meta.env.VITE_APP_DOMAIN': JSON.stringify(process.env.APP_DOMAIN || process.env.VITE_APP_DOMAIN),
    'import.meta.env.VITE_TELEGRAM_BOT_USERNAME': JSON.stringify(process.env.TELEGRAM_BOT_USERNAME || process.env.VITE_TELEGRAM_BOT_USERNAME),
    'import.meta.env.VITE_TELEGRAM_WEBAPP_NAME': JSON.stringify(process.env.TELEGRAM_WEBAPP_NAME || process.env.VITE_TELEGRAM_WEBAPP_NAME),
  }
});