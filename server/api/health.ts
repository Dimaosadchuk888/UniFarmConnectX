import { Request, Response } from 'express';
import { pool } from '../db';

/**
 * Проверка состояния сервера и базы данных
 * Предоставляет информацию о доступности основных подсистем
 */
export async function checkHealth(req: Request, res: Response) {
  try {
    // Проверяем соединение с базой данных
    const dbStatus = { connected: false, responseTime: 0 };
    
    const dbStartTime = Date.now();
    try {
      // Проверяем соединение с БД простым запросом
      await pool.query('SELECT 1');
      dbStatus.connected = true;
    } catch (err) {
      console.error('Health check: DB connection failed', err);
    }
    dbStatus.responseTime = Date.now() - dbStartTime;
    
    // Формируем общий отчет о состоянии
    const status = {
      server: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      },
      database: dbStatus,
      memory: {
        usage: process.memoryUsage(),
        free: process.memoryUsage().heapTotal - process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal
      }
    };
    
    // Возвращаем статус с кодом 200, если все подсистемы доступны, иначе 503
    const statusCode = dbStatus.connected ? 200 : 503;
    
    return res.status(statusCode).json({
      success: dbStatus.connected,
      data: status
    });
  } catch (error) {
    console.error('Health check failed with error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
}

/**
 * Простой ping эндпоинт для проверки доступности сервера
 */
export function ping(req: Request, res: Response) {
  return res.status(200).json({
    success: true,
    data: {
      pong: true,
      timestamp: new Date().toISOString()
    }
  });
}
import { Request, Response } from 'express';

export function healthCheck(req: Request, res: Response) {
  res.status(200).json({ status: 'ok' });
}
