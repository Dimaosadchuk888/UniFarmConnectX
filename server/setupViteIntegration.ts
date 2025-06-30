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

    // Используем Vite middleware с фильтрацией
    app.use((req, res, next) => {
      // Только для файлов разработки
      if (req.path.startsWith('/src/') || 
          req.path.startsWith('/@vite/') || 
          req.path.startsWith('/node_modules/.vite/') ||
          req.path.includes('.tsx') ||
          req.path.includes('.ts') ||
          req.path.includes('.jsx') ||
          req.path.includes('.css')) {
        return vite.middlewares(req, res, next);
      }
      next();
    });
    
    logger.info('[Vite] Development server integrated successfully');
  } catch (error) {
    logger.warn('[Vite] Vite integration failed, continuing without it', { 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}