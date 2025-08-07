import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
// import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async () => {
  const { default: cartographer } = await import("@replit/vite-plugin-cartographer");
  const { default: cartographerConfig } = await import("./cartographer.config.js");

  return {
    plugins: [
      react(),
      themePlugin(),
      // runtimeErrorOverlay(),
      cartographer(cartographerConfig),
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
  };
});