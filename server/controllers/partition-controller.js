/**
 * Контроллер для управления партиционированием
 * 
 * Обрабатывает API-запросы, связанные с партиционированием таблицы транзакций:
 * - Получение статуса партиционирования
 * - Получение списка партиций
 * - Создание новых партиций
 * - Получение логов партиционирования
 */

import * as partitionService from '../services/partition-service';

/**
 * Получение статуса партиционирования таблицы
 */
export async function getPartitioningStatus(req, res) {
  try {
    const tableName = req.query.table || 'transactions';
    const stats = await partitionService.getPartitionStats(tableName);
    
    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error in getPartitioningStatus:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Получение списка партиций
 */
export async function listPartitions(req, res) {
  try {
    const tableName = req.query.table || 'transactions';
    const partitions = await partitionService.getPartitionsList(tableName);
    
    return res.json({
      success: true,
      data: partitions
    });
  } catch (error) {
    console.error('Error in listPartitions:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Получение логов партиционирования
 */
export async function getPartitionLogs(req, res) {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const logs = await partitionService.getPartitionLogs(limit);
    
    return res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error in getPartitionLogs:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Создание новых партиций на указанное количество дней вперед
 */
export async function createPartitions(req, res) {
  try {
    const days = parseInt(req.body.days || '7', 10);
    
    if (isNaN(days) || days < 1 || days > 30) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Parameter "days" must be a number between 1 and 30'
      });
    }
    
    const tableName = req.body.table || 'transactions';
    const result = await partitionService.createFuturePartitions(days, tableName);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: result.error
      });
    }
    
    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in createPartitions:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * Удаление партиции по имени
 */
export async function dropPartition(req, res) {
  try {
    const { partitionName, tableName = 'transactions' } = req.body;
    
    if (!partitionName) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Parameter "partitionName" is required'
      });
    }
    
    // Проверяем формат имени партиции для безопасности
    const partitionNameRegex = new RegExp(`^${tableName}_\\d{4}_\\d{2}_\\d{2}$`);
    if (!partitionNameRegex.test(partitionName)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Invalid partition name format. Expected format: ${tableName}_YYYY_MM_DD`
      });
    }
    
    const result = await partitionService.dropPartition(partitionName, tableName);
    
    if (!result.dropped) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: result.error
      });
    }
    
    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in dropPartition:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
}