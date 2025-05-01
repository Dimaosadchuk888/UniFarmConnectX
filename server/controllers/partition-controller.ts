/**
 * Контроллер для управления партициями
 * Позволяет получать информацию о партициях и логах их создания
 */

import { Request, Response } from 'express';
import { partitionService } from '../services/partition-service';

/**
 * Получение списка всех партиций с информацией о них
 */
export async function getPartitionsList(req: Request, res: Response) {
  try {
    const partitions = await partitionService.getAllPartitions();
    
    return res.json({
      success: true,
      data: {
        partitions,
        total: partitions.length
      }
    });
  } catch (error: any) {
    console.error('Ошибка при получении списка партиций:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Ошибка при получении списка партиций',
      details: error.message
    });
  }
}

/**
 * Получение логов создания партиций
 */
export async function getPartitionLogs(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const logs = await partitionService.getPartitionLogs(limit);
    
    return res.json({
      success: true,
      data: {
        logs,
        total: logs.length
      }
    });
  } catch (error: any) {
    console.error('Ошибка при получении логов партиций:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Ошибка при получении логов партиций',
      details: error.message
    });
  }
}

/**
 * Проверка статуса партиционирования
 */
export async function checkPartitioningStatus(req: Request, res: Response) {
  try {
    const isPartitioned = await partitionService.isTablePartitioned();
    
    return res.json({
      success: true,
      data: {
        is_partitioned: isPartitioned,
        status: isPartitioned ? 'active' : 'not_active'
      }
    });
  } catch (error: any) {
    console.error('Ошибка при проверке статуса партиционирования:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Ошибка при проверке статуса партиционирования',
      details: error.message
    });
  }
}

/**
 * Ручное создание партиций на будущие даты
 */
export async function createFuturePartitions(req: Request, res: Response) {
  try {
    const daysAhead = req.body.days_ahead ? parseInt(req.body.days_ahead) : 5;
    
    // Проверяем значение дней
    if (daysAhead < 1 || daysAhead > 30) {
      return res.status(400).json({
        success: false,
        error: 'Количество дней должно быть от 1 до 30'
      });
    }
    
    const result = await partitionService.createFuturePartitions(daysAhead);
    
    return res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Ошибка при создании партиций:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Ошибка при создании партиций',
      details: error.message
    });
  }
}