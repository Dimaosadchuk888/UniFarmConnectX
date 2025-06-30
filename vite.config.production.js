import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(process.cwd(), 'client'),
  build: {
    outDir: path.resolve(process.cwd(), 'dist/public'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(process.cwd(), 'client/index.html')
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'client', 'src'),
      '@shared': path.resolve(process.cwd(), 'shared'),
      '@assets': path.resolve(process.cwd(), 'attached_assets')
    }
  }
});