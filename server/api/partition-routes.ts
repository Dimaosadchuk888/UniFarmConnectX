/**
 * API маршруты для управления партиционированием таблицы transactions
 * 
 * Добавляет следующие API эндпоинты:
 * - GET /api/admin/partitions/status - Получение статуса партиционирования
 * - GET /api/admin/partitions/list - Получение списка партиций 
 * - GET /api/admin/partitions/logs - Получение логов партиционирования
 * - POST /api/admin/partitions/create - Создание новых партиций
 * - POST /api/admin/partitions/drop - Удаление партиции
 */

import { Express, Request, Response, NextFunction } from 'express';
import * as partitionController from '../controllers/partition-controller.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

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
  // Префикс для всех API маршрутов партиционирования (согласно ТЗ)
  const baseUrl = '/api/partitions';
  
  // GET /api/partitions - Получение списка всех партиций
  app.get(baseUrl, adminAuthMiddleware, (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      partitionController.listPartitions(req, res);
    } catch (error) {
      next(error);
    }
  });
  
  // GET /api/partitions/status - Получение статуса партиционирования
  app.get(`${baseUrl}/status`, adminAuthMiddleware, (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      partitionController.getPartitioningStatus(req, res);
    } catch (error) {
      next(error);
    }
  });
  
  // GET /api/partitions/logs - Получение логов партиционирования
  app.get(`${baseUrl}/logs`, adminAuthMiddleware, (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      partitionController.getPartitionLogs(req, res);
    } catch (error) {
      next(error);
    }
  });
  
  // POST /api/partitions - Создание новых партиций
  app.post(baseUrl, adminAuthMiddleware, (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      partitionController.createPartitions(req, res);
    } catch (error) {
      next(error);
    }
  });
  
  // DELETE /api/partitions/:id - Удаление указанной партиции
  app.delete(`${baseUrl}/:id`, adminAuthMiddleware, (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      // Получаем id из URL-параметра и преобразуем в имя партиции
      req.body = req.body || {}; // Создаем пустой объект для тела, если его нет
      req.body.partitionName = `transactions_${req.params.id}`;
      partitionController.dropPartition(req, res);
    } catch (error) {
      next(error);
    }
  });
  
  // Логируем информацию об активации маршрутов
  console.log(`[PartitionRoutes] Зарегистрированы маршруты для управления партиционированием: ${baseUrl}/*`);
}