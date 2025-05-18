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
import path from 'path';
import fs from 'fs';

/**
 * Improved health check endpoint that responds with appropriate content type
 */
export function healthCheck(req: Request, res: Response) {
  if (req.accepts('html')) {
    // For browser requests, send HTML
    const projectRoot = process.cwd();
    const healthHtmlPath = path.join(projectRoot, 'server', 'public', 'health.html');
    
    if (fs.existsSync(healthHtmlPath)) {
      return res.sendFile(healthHtmlPath);
    }
    
    // Fall back to inline HTML if file not found
    return res.status(200).send(`<!DOCTYPE html>
<html>
<head>
    <title>UniFarm API Server - Health Check</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #4CAF50;
        }
        .status {
            font-size: 24px;
            margin: 20px 0;
            color: #4CAF50;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>UniFarm API Server</h1>
        <p class="status">Status: ONLINE</p>
        <p>The health check passed successfully.</p>
        <p>Server time: ${new Date().toISOString()}</p>
    </div>
</body>
</html>`);
  }
  
  // For API requests, send JSON
  return res.status(200).json({ 
    status: 'ok', 
    message: 'Health check passed',
    serverTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
}
