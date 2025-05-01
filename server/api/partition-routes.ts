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

import { Express, Request, Response } from 'express';
import * as partitionController from '../controllers/partition-controller';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

// Используем интерфейс RequestWithUser из adminAuthMiddleware.ts
interface RequestWithUser extends Request {
  user?: {
    id: number;
    [key: string]: any;
  };
}

export function registerPartitionRoutes(app: Express): void {
  // Маршрут для получения статуса партиционирования
  app.get('/api/admin/partitions/status', adminAuthMiddleware, (req: Request, res: Response) => {
    partitionController.getPartitioningStatus(req, res);
  });
  
  // Маршрут для получения списка партиций
  app.get('/api/admin/partitions/list', adminAuthMiddleware, (req: Request, res: Response) => {
    partitionController.listPartitions(req, res);
  });
  
  // Маршрут для получения логов партиционирования
  app.get('/api/admin/partitions/logs', adminAuthMiddleware, (req: Request, res: Response) => {
    partitionController.getPartitionLogs(req, res);
  });
  
  // Маршрут для создания новых партиций
  app.post('/api/admin/partitions/create', adminAuthMiddleware, (req: Request, res: Response) => {
    partitionController.createPartitions(req, res);
  });
  
  // Маршрут для удаления партиции
  app.post('/api/admin/partitions/drop', adminAuthMiddleware, (req: Request, res: Response) => {
    partitionController.dropPartition(req, res);
  });
  
  console.log('[Routes] Партиционные API маршруты зарегистрированы');
}