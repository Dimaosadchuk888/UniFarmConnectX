/**
 * Vite Integration for Development Mode
 * Интегрирует Vite dev server с Express для обработки TypeScript/React файлов
 */

import type { Express } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { logger } from '../core';

export async function setupViteIntegration(app: Express): Promise<void> {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (!isDevelopment) {
    logger.info('[Vite] Skipping integration in production mode');
    return;
  }

  try {
    // Создаем Vite dev server
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: path.resolve(process.cwd(), 'client'),
    });

    // Используем Vite middleware для обработки запросов
    app.use(vite.middlewares);
    
    logger.info('[Vite] Development server integrated successfully');
  } catch (error) {
    logger.error('[Vite] Failed to setup integration', { error });
    throw error;
  }
}