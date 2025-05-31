import { Request, Response } from 'express';

export async function quickDbTest(req: Request, res: Response) {
  try {
    console.log('[QUICK-DB-TEST] Начинаем быстрый тест базы данных...');

    // Используем unified database connection
    const { queryWithRetry, getConnectionStatus } = await import('../db-unified');
    
    // Получаем статус подключения
    const connectionStatus = getConnectionStatus();
    console.log('[QUICK-DB-TEST] Статус подключения:', connectionStatus);

    if (!connectionStatus.isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        connectionStatus,
        timestamp: new Date().toISOString()
      });
    }

    // Тест 1: Простой SELECT
    const simpleTest = await queryWithRetry('SELECT 1 as test_result');
    console.log('[QUICK-DB-TEST] Простой SELECT выполнен:', simpleTest);

    // Тест 2: Подсчет пользователей
    const userCountResult = await queryWithRetry('SELECT COUNT(*) as count FROM users');
    const userCount = userCountResult[0]?.count || 0;
    console.log('[QUICK-DB-TEST] Количество пользователей:', userCount);

    // Тест 3: Проверка текущего времени БД
    const timeTest = await queryWithRetry('SELECT NOW() as current_time');
    console.log('[QUICK-DB-TEST] Время БД:', timeTest);

    // Тест 4: Проверка миссий
    const missionsTest = await queryWithRetry('SELECT COUNT(*) as missions_count FROM missions');
    const missionsCount = missionsTest[0]?.missions_count || 0;
    console.log('[QUICK-DB-TEST] Количество миссий:', missionsCount);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      connectionStatus,
      data: {
        simpleQuery: simpleTest,
        userCount: parseInt(userCount),
        missionsCount: parseInt(missionsCount),
        databaseTime: timeTest,
        status: 'All tests passed'
      }
    });

  } catch (error) {
    console.error('[QUICK-DB-TEST] Ошибка при тестировании БД:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}

// Экспорт по умолчанию для совместимости
export default quickDbTest;

// Также экспортируем именованную функцию для обратной совместимости
export { quickDbTest };