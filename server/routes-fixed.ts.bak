import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import path from "path";
import fs from "fs";
import cors from 'cors';
import * as healthApi from './api/health'; // Импорт контроллера health API
import { healthCheckMiddleware } from './middleware/health-check';
import { storage } from "./storage";

// Импортируем сервисы
import { userService } from './services/index';
import { referralService } from './services';

// Регистрирует все маршруты приложения
export async function registerRoutes(app: Express): Promise<Server> {
  try {
    console.log('[Routes] Регистрация маршрутов API...');
    
    // Установка порта и привязка к внешнему IP для корректной работы в Replit
    const PORT = process.env.PORT || 3000;
    process.env.PORT = PORT.toString();
    
    // Регистрируем middleware для проверки здоровья сервера - обрабатывает корневой маршрут
    app.use(healthCheckMiddleware);
    
    // Регистрируем маршрут для проверки здоровья API
    app.get('/health', (req: Request, res: Response) => {
      return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    // Настраиваем обработку статических файлов из build директории 
    app.use(express.static(path.join(process.cwd(), 'dist', 'public')));
    
    // Обработка маршрутов для Telegram WebApp
    app.get('/UniFarm*', (req: Request, res: Response) => {
      // Для всех запросов к /UniFarm отправляем index.html
      const projectRoot = process.cwd();
      const indexHtmlPath = path.join(projectRoot, 'dist', 'public', 'index.html');
      
      if (fs.existsSync(indexHtmlPath)) {
        return res.sendFile(indexHtmlPath);
      }
      
      // Проверяем альтернативные пути
      const altPaths = [
        path.resolve('dist/index.html'),
        path.resolve('public/index.html'),
        path.resolve('client/dist/index.html')
      ];

      for (const altPath of altPaths) {
        if (fs.existsSync(altPath)) {
          console.log('[TelegramWebApp] Отправляем index.html из альтернативного пути:', altPath);
          return res.sendFile(altPath);
        }
      }
      
      // Если файл не найден, возвращаем простой HTML
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>UniFarm</title>
            <meta charset="utf-8">
          </head>
          <body>
            <h1>UniFarm</h1>
            <p>API сервер работает. Используйте Telegram для доступа к UniFarm.</p>
            <p>Время сервера: ${new Date().toISOString()}</p>
          </body>
        </html>
      `);
    });
    
    // Обработчик для всех остальных маршрутов - перенаправляем на React SPA
    app.get(/^\/(?!api\/).*$/, (req: Request, res: Response, next: NextFunction) => {
      // Если это API-запрос, просто пропускаем дальше
      if (req.path.startsWith('/api/')) {
        return next();
      }
      
      // Проверяем, содержит ли URL параметр ref_code, который используется для реферальных ссылок
      if (req.query.ref_code) {
        console.log('[TelegramWebApp] Обнаружен запуск через ?ref_code параметр:', req.url);
      }
      
      // Отправляем index.html из публичной директории
      const projectRoot = process.cwd();
      const indexHtmlPath = path.join(projectRoot, 'dist', 'public', 'index.html');
      
      if (fs.existsSync(indexHtmlPath)) {
        return res.sendFile(indexHtmlPath);
      }
      
      // Если файл не найден, просто пропускаем запрос дальше
      next();
    });
    
    // Создаем HTTP сервер и WebSocketServer
    const server = createServer(app);
    const wss = new WebSocketServer({ server });
    
    // Настраиваем обработку WebSocket соединений
    wss.on('connection', (ws: WebSocket, request) => {
      console.log(`[WebSocket] Новое соединение установлено`);
      
      ws.on('message', (message: string) => {
        try {
          console.log(`[WebSocket] Получено сообщение: ${message}`);
          // Обработка сообщений от клиента
        } catch (error) {
          console.error(`[WebSocket] Ошибка обработки сообщения:`, error);
        }
      });
      
      ws.on('close', () => {
        console.log(`[WebSocket] Соединение закрыто`);
      });
      
      ws.on('error', (error) => {
        console.error(`[WebSocket] Ошибка соединения:`, error);
      });
    });
    
    // Запускаем сервер
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] Сервер запущен на http://0.0.0.0:${PORT}`);
    });
    
    return server;
  } catch (error) {
    console.error('[Routes] Ошибка при регистрации маршрутов:', error);
    throw error;
  }
}