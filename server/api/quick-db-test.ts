
import { Request, Response } from 'express';

export async function quickDbTest(req: Request, res: Response) {
  try {
    console.log('[Quick DB Test] Начало диагностики БД');
    
    // Импортируем модуль подключения к БД
    const { queryWithRetry } = await import('../db-unified');
    
    // Простой тест подключения
    const startTime = Date.now();
    const result = await queryWithRetry('SELECT NOW() as current_time, 1 as test_value');
    const responseTime = Date.now() - startTime;
    
    console.log('[Quick DB Test] Результат запроса:', result);
    
    return res.status(200).json({
      success: true,
      data: {
        connectionTest: 'passed',
        responseTime: `${responseTime}ms`,
        currentTime: result[0]?.current_time,
        testValue: result[0]?.test_value
      },
      message: 'База данных доступна'
    });
    
  } catch (error) {
    console.error('[Quick DB Test] Ошибка:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Ошибка подключения к БД',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}
import { Request, Response } from 'express';
import logger from '../utils/logger';

export async function quickDbTest(req: Request, res: Response): Promise<void> {
  try {
    logger.info('[QuickDbTest] 🔍 Выполняется быстрый тест БД');
    
    // Получаем статус подключения к БД
    const { testConnection } = await import('../db-connect-unified');
    const isConnected = await testConnection();
    
    if (isConnected) {
      res.status(200).json({
        success: true,
        message: 'База данных подключена и работает',
        timestamp: new Date().toISOString(),
        status: 'connected'
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'База данных недоступна',
        timestamp: new Date().toISOString(),
        status: 'disconnected'
      });
    }
  } catch (error) {
    logger.error('[QuickDbTest] ❌ Ошибка тестирования БД:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при тестировании базы данных',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}
