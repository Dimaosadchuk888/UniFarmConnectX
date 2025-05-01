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
import * as partitionController from '../controllers/partition-controller';
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
  // Префикс для всех API маршрутов партиционирования
  const baseUrl = '/api/admin/partitions';
  
  // GET /api/admin/partitions/status - Получение статуса партиционирования
  app.get(`${baseUrl}/status`, adminAuthMiddleware, (req: RequestWithUser, res: Response) => {
    partitionController.getPartitioningStatus(req, res);
  });
  
  // GET /api/admin/partitions/list - Получение списка партиций
  app.get(`${baseUrl}/list`, adminAuthMiddleware, (req: RequestWithUser, res: Response) => {
    partitionController.listPartitions(req, res);
  });
  
  // GET /api/admin/partitions/logs - Получение логов партиционирования
  app.get(`${baseUrl}/logs`, adminAuthMiddleware, (req: RequestWithUser, res: Response) => {
    partitionController.getPartitionLogs(req, res);
  });
  
  // POST /api/admin/partitions/create - Создание новых партиций
  app.post(`${baseUrl}/create`, adminAuthMiddleware, (req: RequestWithUser, res: Response) => {
    partitionController.createPartitions(req, res);
  });
  
  // POST /api/admin/partitions/drop - Удаление партиции
  app.post(`${baseUrl}/drop`, adminAuthMiddleware, (req: RequestWithUser, res: Response) => {
    partitionController.dropPartition(req, res);
  });
  
  // Логируем информацию об активации маршрутов
  console.log(`[PartitionRoutes] Зарегистрированы маршруты для управления партиционированием: ${baseUrl}/*`);
}