/**
 * Контроллер для управления партиционированием
 * 
 * Обрабатывает API-запросы, связанные с партиционированием таблицы транзакций:
 * - Получение статуса партиционирования
 * - Получение списка партиций
 * - Создание новых партиций
 * - Получение логов партиционирования
 */

import * as partitionService from '../services/partition-service.js';

// Получение статуса партиционирования
export async function getPartitioningStatus(req, res) {
  try {
    // Проверяем, является ли пользователь администратором
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    // Если есть параметр check_admin=true, проверяем, является ли пользователь администратором
    if (req.query.check_admin === 'true') {
      // Здесь должна быть проверка на администратора
      // Этот код заглушка, в реальном приложении должна быть проверка роли
      const isAdmin = userId === 1; // Временно считаем, что пользователь с ID=1 - админ
      
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Administrative access required'
        });
      }
    }
    
    // Получаем статистику о партициях
    const stats = await partitionService.getPartitionStats();
    
    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error in getPartitioningStatus:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// Получение списка партиций
export async function listPartitions(req, res) {
  try {
    // Проверяем, является ли пользователь администратором
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    // Получаем список партиций
    const partitions = await partitionService.getPartitionsList();
    
    return res.json({
      success: true,
      data: partitions
    });
  } catch (error) {
    console.error('Error in listPartitions:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// Создание партиций на будущие дни
export async function createPartitions(req, res) {
  try {
    // Проверяем, является ли пользователь администратором
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    // Получаем количество дней из запроса или используем значение по умолчанию
    const days = parseInt(req.body.days || req.query.days || '7', 10);
    
    if (isNaN(days) || days < 1 || days > 90) {
      return res.status(400).json({
        success: false,
        error: 'Invalid days parameter: must be between 1 and 90'
      });
    }
    
    // Создаем партиции на будущие дни
    const result = await partitionService.createFuturePartitions(days);
    
    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in createPartitions:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// Получение логов партиционирования
export async function getPartitionLogs(req, res) {
  try {
    // Проверяем, является ли пользователь администратором
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    // Получаем лимит из запроса или используем значение по умолчанию
    const limit = parseInt(req.query.limit || '50', 10);
    
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit parameter: must be between 1 and 1000'
      });
    }
    
    // Получаем логи партиционирования
    const logs = await partitionService.getPartitionLogs(limit);
    
    return res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error in getPartitionLogs:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// Удаление партиции
export async function dropPartition(req, res) {
  try {
    // Проверяем, является ли пользователь администратором
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    // Получаем имя партиции из запроса
    const partitionName = req.body.partition_name || req.query.partition_name;
    
    if (!partitionName) {
      return res.status(400).json({
        success: false,
        error: 'Partition name is required'
      });
    }
    
    // Проверяем, что имя партиции начинается с "transactions_"
    if (!partitionName.startsWith('transactions_')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid partition name: must start with "transactions_"'
      });
    }
    
    // Удаляем партицию
    const result = await partitionService.dropPartition(partitionName);
    
    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in dropPartition:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}