
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
