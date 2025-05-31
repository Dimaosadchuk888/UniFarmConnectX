import { Request, Response } from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { sql } from 'drizzle-orm';

export default async function quickDbTest(req: Request, res: Response) {
  try {
    console.log('[QUICK-DB-TEST] Начинаем быстрый тест базы данных...');

    // Тест 1: Простой SELECT
    const simpleTest = await db.execute(sql`SELECT 1 as test_result`);
    console.log('[QUICK-DB-TEST] Простой SELECT выполнен:', simpleTest);

    // Тест 2: Подсчет пользователей
    const userCount = await db.select().from(users);
    console.log('[QUICK-DB-TEST] Количество пользователей:', userCount.length);

    // Тест 3: Проверка текущего времени БД
    const timeTest = await db.execute(sql`SELECT NOW() as current_time`);
    console.log('[QUICK-DB-TEST] Время БД:', timeTest);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        simpleQuery: simpleTest,
        userCount: userCount.length,
        databaseTime: timeTest,
        status: 'All tests passed'
      }
    });

  } catch (error) {
    console.error('[QUICK-DB-TEST] Ошибка при тестировании БД:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}