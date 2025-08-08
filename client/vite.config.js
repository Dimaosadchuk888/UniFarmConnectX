const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");
const path = require("path");

module.exports = defineConfig({
  plugins: [
    react(),
  ],
  root: __dirname,
  server: {
    port: 5173,
    host: "0.0.0.0",
    hmr: { overlay: false },
    allowedHosts: ['web-production-8e45b.up.railway.app'],
  },
  build: {
    outDir: "../dist/public",
    sourcemap: true,
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}); 