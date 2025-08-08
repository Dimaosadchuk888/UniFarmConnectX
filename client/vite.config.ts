import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    port: 5173,
    host: "0.0.0.0",
    hmr: { overlay: false },
    allowedHosts: ['web-production-8e45b.up.railway.app'],
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});