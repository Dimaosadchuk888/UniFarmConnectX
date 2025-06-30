/**
 * Минимальный сервер UniFarm для диагностики проблем
 * Без Vite интеграции для изоляции проблемы
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { logger } from '../core';

const app = express();
const PORT = 3000;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование запросов
app.use((req: Request, res: Response, next) => {
  logger.info(`[MinimalServer] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    server: 'minimal-unifarm',
    timestamp: new Date().toISOString() 
  });
});

// API routes placeholder
app.get('/api/v2/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    api: 'v2',
    timestamp: new Date().toISOString() 
  });
});

// Static files
const staticPath = path.resolve(process.cwd(), 'dist');
logger.info(`[MinimalServer] Serving static files from: ${staticPath}`);
app.use(express.static(staticPath));

// SPA fallback
app.get('*', (req: Request, res: Response) => {
  const indexPath = path.resolve(process.cwd(), 'dist', 'public', 'index.html');
  logger.info(`[MinimalServer] SPA fallback for: ${req.path}`);
  res.sendFile(indexPath, (err) => {
    if (err) {
      logger.error(`[MinimalServer] Error serving index.html:`, err);
      res.status(404).json({ 
        error: 'Index file not found',
        path: req.path 
      });
    }
  });
});

// Error handling
app.use((err: any, req: Request, res: Response, next: any) => {
  logger.error('[MinimalServer] Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`[MinimalServer] UniFarm server running on http://0.0.0.0:${PORT}`);
  logger.info(`[MinimalServer] Health check: http://localhost:${PORT}/health`);
});

export default app;