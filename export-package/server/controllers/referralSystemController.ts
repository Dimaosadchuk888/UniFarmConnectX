/**
 * Контроллер для управления реферальной системой
 * 
 * Предоставляет API для переключения режимов реферальной системы
 * и получения информации о её состоянии и производительности
 */

import { Request, Response } from 'express';
import * as dotenv from 'dotenv';
import fs from 'fs';
import { referralSystem } from '../services/referralSystemIntegrator';
import { db } from '../db';
import { sql } from 'drizzle-orm';

// Расширяем тип запроса для поддержки пользовательских сессий
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        ref_code: string;
      };
    }
  }
}

/**
 * Обновляет переменную окружения в .env файле
 * @param key Ключ переменной
 * @param value Новое значение
 * @returns Успешность операции
 */
async function updateEnvFile(key: string, value: string): Promise<boolean> {
  try {
    // Путь к файлу .env
    const envPath = './.env';
    
    if (!fs.existsSync(envPath)) {
      console.error('Файл .env не найден');
      return false;
    }
    
    // Читаем файл
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Ищем переменную
    const regex = new RegExp(`^${key}=.*`, 'm');
    
    if (regex.test(envContent)) {
      // Если переменная существует, обновляем её
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Если переменной нет, добавляем её
      envContent += `\n${key}=${value}`;
    }
    
    // Записываем изменения обратно в файл
    fs.writeFileSync(envPath, envContent);
    
    // Обновляем переменную в текущем процессе
    process.env[key] = value;
    
    return true;
  } catch (error) {
    console.error('Ошибка при обновлении .env файла:', error);
    return false;
  }
}

/**
 * Получение текущего режима работы реферальной системы
 */
export async function getReferralSystemMode(req: Request, res: Response) {
  try {
    const isOptimized = referralSystem.isOptimizedMode();
    
    return res.json({
      success: true,
      data: {
        mode: isOptimized ? 'optimized' : 'standard',
        isOptimized
      }
    });
  } catch (error) {
    console.error('Ошибка при получении режима работы реферальной системы:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Переключение режима работы реферальной системы (оптимизированный/стандартный)
 */
export async function toggleOptimizedReferralSystem(req: Request, res: Response) {
  try {
    const { mode } = req.body;
    
    if (!mode || !['optimized', 'standard'].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: 'Требуется указать режим (optimized или standard)'
      });
    }
    
    // Текущий режим
    const currentMode = referralSystem.isOptimizedMode();
    const newMode = mode === 'optimized';
    
    // Если режим уже установлен, ничего не делаем
    if (currentMode === newMode) {
      return res.json({
        success: true,
        data: {
          mode,
          changed: false,
          message: `Реферальная система уже работает в ${mode} режиме`
        }
      });
    }
    
    // Переключаем режим
    if (newMode) {
      referralSystem.enableOptimizedMode();
    } else {
      referralSystem.disableOptimizedMode();
    }
    
    // Обновляем переменную окружения
    const envUpdated = await updateEnvFile('USE_OPTIMIZED_REFERRALS', newMode ? 'true' : 'false');
    
    return res.json({
      success: true,
      data: {
        mode,
        changed: true,
        envUpdated,
        message: `Реферальная система переключена в ${mode} режим`
      }
    });
  } catch (error) {
    console.error('Ошибка при переключении режима реферальной системы:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Получение метрик производительности реферальной системы
 */
export async function getReferralSystemMetrics(req: Request, res: Response) {
  try {
    // Получаем информацию о производительности из БД
    const [standardMetrics] = await db.execute(sql`
      SELECT 
        COUNT(*) as referral_count,
        AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_time_sec,
        MAX(EXTRACT(EPOCH FROM (processed_at - created_at))) as max_processing_time_sec,
        COUNT(DISTINCT source_user_id) as unique_sources,
        SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as error_count
      FROM reward_distribution_logs
      WHERE system_type = 'standard'
    `);

    const [optimizedMetrics] = await db.execute(sql`
      SELECT 
        COUNT(*) as referral_count,
        AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_time_sec,
        MAX(EXTRACT(EPOCH FROM (processed_at - created_at))) as max_processing_time_sec,
        COUNT(DISTINCT source_user_id) as unique_sources,
        SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as error_count
      FROM reward_distribution_logs
      WHERE system_type = 'optimized'
    `);

    // Получаем общую статистику рефералов
    const [totalStats] = await db.execute(sql`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN parent_ref_code IS NOT NULL THEN 1 END) as referred_users,
        COUNT(DISTINCT parent_ref_code) as unique_referrers
      FROM users
    `);

    // Текущий режим работы
    const currentMode = referralSystem.isOptimizedMode() ? 'optimized' : 'standard';

    return res.json({
      success: true,
      data: {
        currentMode,
        standardMetrics: standardMetrics || { 
          referral_count: 0,
          avg_processing_time_sec: 0,
          max_processing_time_sec: 0,
          unique_sources: 0,
          error_count: 0
        },
        optimizedMetrics: optimizedMetrics || {
          referral_count: 0,
          avg_processing_time_sec: 0,
          max_processing_time_sec: 0,
          unique_sources: 0,
          error_count: 0
        },
        totalStats: totalStats || {
          total_users: 0,
          referred_users: 0,
          unique_referrers: 0
        }
      }
    });
  } catch (error) {
    console.error('Ошибка при получении метрик реферальной системы:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Получение оптимизированной статистики по реферальной структуре для пользователя
 */
export async function getReferralStructure(req: Request, res: Response) {
  try {
    // Получаем ID пользователя
    const userId = req.user?.id || parseInt(req.query.userId as string);
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Не указан ID пользователя'
      });
    }
    
    // Получаем структуру рефералов
    const structure = await referralSystem.getReferralStructure(userId);
    
    return res.json({
      success: true,
      data: {
        userId,
        structure,
        mode: referralSystem.isOptimizedMode() ? 'optimized' : 'standard'
      }
    });
  } catch (error) {
    console.error('Ошибка при получении структуры рефералов:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}