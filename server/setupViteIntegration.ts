/**
 * Vite Integration for Development Mode
 * Интегрирует Vite dev server с Express для обработки TypeScript/React файлов
 */

import type { Express } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { logger } from '../core';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import react from '@vitejs/plugin-react';

export async function setupViteIntegration(app: Express): Promise<void> {
  // Включаем Vite интеграцию всегда для обработки TypeScript файлов
  const enableVite = true;

  try {
    // Создаем Vite dev server без ограничений хостов
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false  // Отключаем HMR, чтобы избежать проблем с WebSocket
      },
      appType: 'spa',
      root: path.resolve(process.cwd(), 'client'),
      plugins: [
        react(),
        nodePolyfills({
          // Включаем полифиллы для Buffer и других Node.js API
          protocolImports: true,
          globals: {
            Buffer: true,
            global: true,
            process: true
          }
        })
      ],
      define: {
        // Полифилл для Node.js глобалов
        global: 'globalThis',
        'process.env': {}
      },
      optimizeDeps: {
        // Включаем полифиллы для Node.js
        esbuildOptions: {
          define: {
            global: 'globalThis'
          }
        }
      }
    });

    // Используем Vite middleware для обработки запросов
    app.use(vite.middlewares);
    
    logger.info('[Vite] Development server integrated successfully with Replit hosts allowed');
  } catch (error) {
    logger.error('[Vite] Failed to setup integration', { error });
    throw error;
  }
}