/**
 * API маршруты для управления партиционированием таблицы transactions
 * 
 * Добавляет следующие API эндпоинты:
 * - GET /api/partitions - Получение списка партиций 
 * - GET /api/partitions/status - Получение статуса партиционирования
 * - GET /api/partitions/logs - Получение логов партиционирования
 * - POST /api/partitions - Создание новых партиций
 * - DELETE /api/partitions/:id - Удаление партиции
 */

import { Express, Request, Response, NextFunction } from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';

// Импортируем контроллер партиционирования
import * as partitionController from '../controllers/partition-controller.js';

// Определяем интерфейс для типизации расширенного объекта запроса
interface RequestWithUser extends Request {
  user?: {
    id: number;
    [key: string]: any;
  };
}

/**
 * Регистрирует все маршруты для управления партиционированием
 */
export function registerPartitionRoutes(app: Express): void {
  // Префикс для всех API маршрутов партиционирования
  const baseUrl = '/api/partitions';
  
  console.log('[PartitionRoutes] Начинаем регистрацию маршрутов партиционирования');
  
  // GET /api/partitions - Получение списка всех партиций
  app.get(baseUrl, adminAuthMiddleware, (req: Request, res: Response, next: NextFunction) => {
    console.log('[PartitionRoutes] Обрабатываем GET запрос на получение списка партиций');
    try {
      partitionController.listPartitions(req, res);
    } catch (error: any) {
      console.error('[PartitionRoutes] Ошибка в GET /api/partitions:', error);
      res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера',
        errors: error.message
      });
    }
  });
  
  // GET /api/partitions/status - Получение статуса партиционирования
  app.get(`${baseUrl}/status`, adminAuthMiddleware, (req: Request, res: Response, next: NextFunction) => {
    console.log('[PartitionRoutes] Обрабатываем GET запрос на получение статуса партиционирования');
    try {
      // Получаем имя функции из контроллера
      console.log('[PartitionRoutes] Доступные методы в контроллере:', 
        Object.keys(partitionController).filter(key => typeof partitionController[key] === 'function'));
      
      // Корректное имя функции - getPartitioningStatus в контроллере
      partitionController.getPartitioningStatus(req, res);
    } catch (error: any) {
      console.error('[PartitionRoutes] Ошибка в GET /api/partitions/status:', error);
      res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера',
        errors: error.message
      });
    }
  });
  
  // GET /api/partitions/logs - Получение логов партиционирования
  app.get(`${baseUrl}/logs`, adminAuthMiddleware, (req: Request, res: Response, next: NextFunction) => {
    console.log('[PartitionRoutes] Обрабатываем GET запрос на получение логов партиционирования');
    try {
      partitionController.getPartitionLogs(req, res);
    } catch (error: any) {
      console.error('[PartitionRoutes] Ошибка в GET /api/partitions/logs:', error);
      res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера',
        errors: null
      });
    }
  });
  
  // POST /api/partitions - Создание новых партиций
  app.post(baseUrl, adminAuthMiddleware, (req: Request, res: Response, next: NextFunction) => {
    console.log('[PartitionRoutes] Обрабатываем POST запрос на создание партиций');
    try {
      partitionController.createPartitions(req, res);
    } catch (error: any) {
      console.error('[PartitionRoutes] Ошибка в POST /api/partitions:', error);
      res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера',
        errors: error.message
      });
    }
  });
  
  // DELETE /api/partitions/:id - Удаление указанной партиции
  app.delete(`${baseUrl}/:id`, adminAuthMiddleware, (req: Request, res: Response, next: NextFunction) => {
    console.log(`[PartitionRoutes] Обрабатываем DELETE запрос на удаление партиции с ID: ${req.params.id}`);
    try {
      // Получаем id из URL-параметра и преобразуем в имя партиции
      req.body = req.body || {}; // Создаем пустой объект для тела, если его нет
      req.body.partitionName = `transactions_${req.params.id}`;
      partitionController.dropPartition(req, res);
    } catch (error: any) {
      console.error('[PartitionRoutes] Ошибка в DELETE /api/partitions/:id:', error);
      res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера',
        errors: error.message
      });
    }
  });
  
  // Логируем информацию об активации маршрутов
  console.log(`[PartitionRoutes] Зарегистрированы маршруты для управления партиционированием: ${baseUrl}/*`);
}