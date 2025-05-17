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
import { db, pool } from '../db.js';

// Импортируем контроллер партиционирования
import * as partitionController from '../controllers/partition-controller.js';

/**
 * Вспомогательная функция для выполнения SQL запросов
 */
async function executeQuery(query: string, params: any[] = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}

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
      console.log('[PartitionRoutes] Доступные методы в контроллере:', 
        Object.keys(partitionController).filter(key => typeof partitionController[key] === 'function'));
      
      // Правильное имя функции - listPartitions в маршрутах, getPartitionsList в контроллере
      console.log('[PartitionRoutes] Вызываем метод getPartitionsList');
      partitionController.getPartitionsList(req, res);
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
      // Используем правильное имя функции - checkPartitioningStatus
      console.log('[PartitionRoutes] Вызываем метод checkPartitioningStatus');
      partitionController.checkPartitioningStatus(req, res);
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
      console.log('[PartitionRoutes] Доступные методы в контроллере:', 
        Object.keys(partitionController).filter(key => typeof partitionController[key] === 'function'));
      
      // Правильное имя функции в контроллере - createFuturePartitions
      console.log('[PartitionRoutes] Вызываем метод createFuturePartitions');
      partitionController.createFuturePartitions(req, res);
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
  app.delete(`${baseUrl}/:id`, adminAuthMiddleware, async (req: Request, res: Response) => {
    // Используем безопасный вывод в лог (без прямой вставки параметра запроса)
    console.log('[PartitionRoutes] Обрабатываем DELETE запрос на удаление партиции');
    try {
      // Получаем id из URL-параметра и преобразуем в имя партиции
      const partitionName = `transactions_${req.params.id}`;
      
      console.log('[PartitionRoutes] Проверка партиции на соответствие формату');
      
      // Проверяем формат имени партиции для безопасности
      if (!partitionName.match(/^transactions_\d{4}_\d{2}_\d{2}$/)) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Неверный формат имени партиции. Ожидается формат: transactions_YYYY_MM_DD'
        });
      }
      
      console.log('[PartitionRoutes] Начинаем процесс удаления партиции');
      
      // Используем executeQuery из сервиса для проверки существования партиции
      try {
        // Проверяем существование партиции с использованием параметризованного SQL запроса
        const query = `
          SELECT EXISTS (
            SELECT 1 FROM pg_catalog.pg_class
            WHERE relname = $1
          ) as exists;
        `;
        
        const result = await executeQuery(query, [partitionName]);
        const exists = result[0]?.exists || false;
        
        if (!exists) {
          return res.status(404).json({
            success: false,
            error: 'Not Found',
            message: `Партиция не найдена`
          });
        }
        
        // Удаляем партицию используя параметризованный запрос
        const dropQuery = 'DROP TABLE IF EXISTS $1:name;';
        await executeQuery(dropQuery, [partitionName]);
        
        // Логируем операцию удаления без упоминания точного имени партиции в логах
        console.log('[PartitionRoutes] Партиция успешно удалена');
        
        // Формируем ответ с безопасным сообщением
        return res.status(200).json({
          success: true,
          data: {
            message: 'Партиция успешно удалена',
            partitionName
          }
        });
      } catch (queryError: any) {
        console.error('[PartitionRoutes] Ошибка при выполнении SQL запроса:', queryError);
        return res.status(500).json({
          success: false,
          error: 'Database Error',
          message: 'Ошибка при работе с базой данных',
          details: process.env.NODE_ENV === 'development' ? queryError.message : undefined
        });
      }
    } catch (error: any) {
      console.error('[PartitionRoutes] Ошибка в DELETE /api/partitions/:id:', error);
      return res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера',
        errors: error.message
      });
    }
  });
  
  // Логируем информацию об активации маршрутов
  console.log(`[PartitionRoutes] Зарегистрированы маршруты для управления партиционированием: ${baseUrl}/*`);
}