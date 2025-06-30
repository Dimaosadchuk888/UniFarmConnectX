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
  try {
    logger.info('[Vite] Creating Vite server with minimal configuration...');
    
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa',
      root: path.resolve(process.cwd(), 'client'),
      base: '/',
      clearScreen: false,
      logLevel: 'warn',
      plugins: [
        react()
      ],
      resolve: {
        alias: {
          '@': path.resolve(process.cwd(), 'client/src')
        }
      }
    });

    // Используем Vite middleware для всех запросов кроме API
    app.use((req, res, next) => {
      // Пропускаем API маршруты и специальные endpoints
      if (req.path.startsWith('/api/') || 
          req.path.startsWith('/health') ||
          req.path === '/webhook' ||
          req.path === '/manifest.json' ||
          req.path === '/tonconnect-manifest.json') {
        return next();
      }
      
      // Vite обрабатывает все остальное (включая index.html, assets, и т.д.)
      return vite.middlewares(req, res, next);
    });
    
    logger.info('[Vite] Development server integrated successfully');
  } catch (error) {
    logger.warn('[Vite] Vite integration failed, continuing without it', { 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}