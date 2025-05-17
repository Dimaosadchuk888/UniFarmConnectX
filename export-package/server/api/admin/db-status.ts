/**
 * Эндпоинт для проверки статуса базы данных
 * Доступен по пути /api/admin/db-status
 */

import { Request, Response } from 'express';
import { db, pool, dbConnectionStatus, isTablePartitioned } from '../../db';

export async function getDatabaseStatus(req: Request, res: Response) {
  try {
    // Выполняем простой запрос для проверки подключения
    const result = await pool.query('SELECT NOW() as time');
    const timestamp = result.rows[0].time;
    
    // Проверяем наличие и статус партиционирования
    let partitionStatus = false;
    try {
      partitionStatus = await isTablePartitioned();
    } catch (err) {
      console.error('[DB Status] Ошибка при проверке партиционирования:', err);
    }
    
    // Проверяем наличие основных таблиц
    const tablesQuery = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
      LIMIT 10;
    `);
    
    const tables = tablesQuery.rows.map(row => row.table_name);
    
    // Обновляем статус соединения
    await dbConnectionStatus.update();
    
    // Формируем ответ
    const dbStatus = {
      success: true,
      isConnected: true,
      timestamp,
      databaseProvider: process.env.DATABASE_PROVIDER || 'unknown',
      forcedNeonDb: process.env.FORCE_NEON_DB === 'true',
      disabledReplitDb: process.env.DISABLE_REPLIT_DB === 'true',
      overrideDbProvider: process.env.OVERRIDE_DB_PROVIDER || 'none',
      isPartitioned: partitionStatus,
      partitionStatus: partitionStatus ? 'active' : 'not configured',
      tables: tables,
      pgHost: process.env.PGHOST || 'not set',
      pgSocket: process.env.PGSOCKET || 'not set',
      connectionStatus: dbConnectionStatus,
      environment: process.env.NODE_ENV || 'unknown'
    };
    
    return res.json(dbStatus);
  } catch (error: any) {
    console.error('Ошибка при проверке статуса БД:', error);
    
    return res.status(500).json({
      success: false,
      isConnected: false,
      error: error.message,
      details: error.stack,
      databaseProvider: process.env.DATABASE_PROVIDER || 'unknown',
      forcedNeonDb: process.env.FORCE_NEON_DB === 'true',
      disabledReplitDb: process.env.DISABLE_REPLIT_DB === 'true', 
      overrideDbProvider: process.env.OVERRIDE_DB_PROVIDER || 'none',
      pgHost: process.env.PGHOST || 'not set',
      pgSocket: process.env.PGSOCKET || 'not set',
      environment: process.env.NODE_ENV || 'unknown'
    });
  }
}