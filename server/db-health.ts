/**
 * Модуль для мониторинга состояния подключения к базе данных
 * 
 * Этот модуль предоставляет функции для проверки состояния подключения к базе данных,
 * собирает статистику и управляет процессом переподключения при необходимости.
 */

import { Pool } from 'pg';
import { getDbConfig } from './db-config';

// Статусы соединения
export type ConnectionStatus = 'ok' | 'error' | 'reconnecting';

// Результат проверки соединения
export type CheckResult = {
  timestamp: string;
  success: boolean;
  responseTime: number;
  error?: string;
};

// Результат переподключения
export type ReconnectResult = {
  timestamp: string;
  success: boolean;
  attempts: number;
  totalTime: number;
  error?: string;
};

// Статистика мониторинга
export type MonitorStats = {
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  totalReconnects: number;
  successfulReconnects: number;
  failedReconnects: number;
  avgResponseTime: number;
  avgReconnectTime: number;
  uptime: number;
  downtime: number;
  startTime: string;
  lastDownTime?: string;
  lastUpTime?: string;
};

// Хранение статистики и результатов
let status: ConnectionStatus = 'ok';
let lastCheckResult: CheckResult | null = null;
let lastReconnectResult: ReconnectResult | null = null;
let reconnectingInProgress = false;
let consecutiveFailures = 0;
const maxConsecutiveFailures = 3;

// Статистика
let stats: MonitorStats = {
  totalChecks: 0,
  successfulChecks: 0,
  failedChecks: 0,
  totalReconnects: 0,
  successfulReconnects: 0,
  failedReconnects: 0,
  avgResponseTime: 0,
  avgReconnectTime: 0,
  uptime: 0,
  downtime: 0,
  startTime: new Date().toISOString(),
};

/**
 * Проверяет соединение с базой данных
 * @param pool - Пул подключений к базе данных
 * @returns Promise<boolean> - Результат проверки
 */
export async function checkConnection(pool: Pool): Promise<boolean> {
  // Если уже выполняется переподключение, пропускаем проверку
  if (reconnectingInProgress) {
    return false;
  }
  
  const startTime = Date.now();
  let client = null;
  
  try {
    // Пытаемся получить соединение из пула
    client = await pool.connect();
    
    // Выполняем тестовый запрос
    const result = await client.query('SELECT NOW() as current_time');
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    stats.totalChecks++;
    
    // Соединение успешно
    status = 'ok';
    consecutiveFailures = 0;
    stats.successfulChecks++;
    
    // Если это первое успешное соединение после сбоя, фиксируем время
    if (!stats.lastUpTime || stats.lastDownTime && new Date(stats.lastDownTime) > new Date(stats.lastUpTime)) {
      stats.lastUpTime = new Date().toISOString();
    }
    
    // Обновляем среднее время отклика
    stats.avgResponseTime = 
      (stats.avgResponseTime * (stats.successfulChecks - 1) + responseTime) / 
      stats.successfulChecks;
    
    // Увеличиваем время работы
    stats.uptime += 30; // добавляем 30 секунд (типичный интервал проверки)
    
    // Сохраняем результат проверки
    lastCheckResult = {
      timestamp: new Date().toISOString(),
      success: true,
      responseTime,
    };
    
    console.log(`[${new Date().toISOString()}] ✅ Мониторинг БД: соединение работает (${responseTime}ms)`);
    
    return true;
  } catch (error) {
    // Ошибка при проверке соединения
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    handleConnectionFailure(errorMessage, responseTime);
    
    return false;
  } finally {
    // Освобождаем клиент
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error(`[${new Date().toISOString()}] ❌ Ошибка при освобождении клиента:`, releaseError);
      }
    }
  }
}

/**
 * Обрабатывает ошибку соединения
 * @param error - Сообщение об ошибке
 * @param responseTime - Время отклика
 */
function handleConnectionFailure(error: string, responseTime: number): void {
  stats.totalChecks++;
  stats.failedChecks++;
  consecutiveFailures++;
  
  // Фиксируем время сбоя
  stats.lastDownTime = new Date().toISOString();
  
  // Увеличиваем время простоя
  stats.downtime += 30; // добавляем 30 секунд (типичный интервал проверки)
  
  // Сохраняем результат проверки
  lastCheckResult = {
    timestamp: new Date().toISOString(),
    success: false,
    responseTime,
    error,
  };
  
  console.error(`[${new Date().toISOString()}] ❌ Мониторинг БД: ошибка соединения (${responseTime}ms): ${error}`);
  
  // Устанавливаем статус ошибки
  status = 'error';
}

/**
 * Пытается переподключиться к базе данных путем создания нового пула
 * @returns Promise<boolean> - Результат переподключения
 */
export async function attemptReconnect(): Promise<boolean> {
  // Предотвращаем параллельные попытки переподключения
  if (reconnectingInProgress) {
    return false;
  }
  
  reconnectingInProgress = true;
  status = 'reconnecting';
  
  stats.totalReconnects++;
  const startTime = Date.now();
  
  console.log(`[${new Date().toISOString()}] 🔄 Мониторинг БД: попытка переподключения после ${consecutiveFailures} последовательных ошибок`);
  
  try {
    // Создаем новый пул подключений с настройками
    const newPool = new Pool(getDbConfig());
    
    // Пытаемся подключиться с помощью нового пула
    const client = await newPool.connect();
    
    // Выполняем тестовый запрос
    await client.query('SELECT 1 as test');
    
    // Освобождаем клиент
    client.release();
    
    const endTime = Date.now();
    const reconnectTime = endTime - startTime;
    
    // Переподключение успешно
    stats.successfulReconnects++;
    status = 'ok';
    consecutiveFailures = 0;
    
    // Обновляем среднее время переподключения
    stats.avgReconnectTime = 
      (stats.avgReconnectTime * (stats.successfulReconnects - 1) + reconnectTime) / 
      stats.successfulReconnects;
    
    // Фиксируем время восстановления
    stats.lastUpTime = new Date().toISOString();
    
    // Сохраняем результат переподключения
    lastReconnectResult = {
      timestamp: new Date().toISOString(),
      success: true,
      attempts: 1,
      totalTime: reconnectTime,
    };
    
    console.log(`[${new Date().toISOString()}] ✅ Мониторинг БД: переподключение успешно (${reconnectTime}ms)`);
    
    return true;
  } catch (error) {
    // Ошибка при переподключении
    const endTime = Date.now();
    const reconnectTime = endTime - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Обрабатываем ошибку переподключения
    stats.failedReconnects++;
    status = 'error';
    
    // Сохраняем результат переподключения
    lastReconnectResult = {
      timestamp: new Date().toISOString(),
      success: false,
      attempts: 1,
      totalTime: reconnectTime,
      error: errorMessage,
    };
    
    console.error(`[${new Date().toISOString()}] ❌ Мониторинг БД: ошибка переподключения (${reconnectTime}ms): ${errorMessage}`);
    
    return false;
  } finally {
    reconnectingInProgress = false;
  }
}

/**
 * Сбрасывает статистику мониторинга
 */
export function resetStats(): void {
  stats = {
    totalChecks: 0,
    successfulChecks: 0,
    failedChecks: 0,
    totalReconnects: 0,
    successfulReconnects: 0,
    failedReconnects: 0,
    avgResponseTime: 0,
    avgReconnectTime: 0,
    uptime: 0,
    downtime: 0,
    startTime: new Date().toISOString(),
  };
  
  console.log(`[${new Date().toISOString()}] 🔄 Мониторинг БД: статистика сброшена`);
}

/**
 * Получает текущий статус соединения
 */
export function getStatus(): ConnectionStatus {
  return status;
}

/**
 * Получает результат последней проверки соединения
 */
export function getLastCheckResult(): CheckResult | null {
  return lastCheckResult;
}

/**
 * Получает результат последнего переподключения
 */
export function getLastReconnectResult(): ReconnectResult | null {
  return lastReconnectResult;
}

/**
 * Получает статистику мониторинга
 */
export function getStats(): MonitorStats {
  return { ...stats }; // Возвращаем копию объекта
}

/**
 * Проверяет, нужно ли пытаться переподключиться
 */
export function shouldReconnect(): boolean {
  return consecutiveFailures >= maxConsecutiveFailures && !reconnectingInProgress;
}