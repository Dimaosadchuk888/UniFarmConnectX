
export interface DbAutoRecoveryConfig {
  initialBackoff: number;
  maxBackoff: number;
  backoffFactor: number;
  resetThreshold: number;
  maxConsecutiveFailures: number;
}

let recoveryConfig: DbAutoRecoveryConfig | null = null;
let currentBackoff = 0;
let consecutiveFailures = 0;
let lastSuccessTime = Date.now();
let recoveryTimer: NodeJS.Timeout | null = null;

/**
 * Инициализирует систему автоматического восстановления соединения с БД
 */
export function initDbAutoRecovery(config: DbAutoRecoveryConfig): void {
  recoveryConfig = config;
  currentBackoff = config.initialBackoff;
  
  console.log('[DbAutoRecovery] ✅ Система автоматического восстановления БД инициализирована');
  console.log('[DbAutoRecovery] Конфигурация:', {
    initialBackoff: config.initialBackoff,
    maxBackoff: config.maxBackoff,
    backoffFactor: config.backoffFactor,
    resetThreshold: config.resetThreshold,
    maxConsecutiveFailures: config.maxConsecutiveFailures
  });
}

/**
 * Сигнализирует об успешном подключении к БД
 */
export function signalDbSuccess(): void {
  if (!recoveryConfig) return;
  
  const now = Date.now();
  const timeSinceLastSuccess = now - lastSuccessTime;
  
  // Если прошло достаточно времени, сбрасываем счетчик неудач
  if (timeSinceLastSuccess > recoveryConfig.resetThreshold) {
    consecutiveFailures = 0;
    currentBackoff = recoveryConfig.initialBackoff;
  }
  
  lastSuccessTime = now;
  
  // Очищаем таймер восстановления, если он был активен
  if (recoveryTimer) {
    clearTimeout(recoveryTimer);
    recoveryTimer = null;
  }
}

/**
 * Сигнализирует о неудаче подключения к БД
 */
export function signalDbFailure(): void {
  if (!recoveryConfig) return;
  
  consecutiveFailures++;
  
  console.warn(`[DbAutoRecovery] ❌ Неудача подключения к БД #${consecutiveFailures}`);
  
  // Если превышено максимальное количество неудач подряд
  if (consecutiveFailures >= recoveryConfig.maxConsecutiveFailures) {
    console.error('[DbAutoRecovery] 🚨 Превышено максимальное количество неудач, требуется вмешательство администратора');
    return;
  }
  
  // Планируем попытку восстановления
  scheduleRecovery();
}

/**
 * Планирует попытку восстановления соединения
 */
function scheduleRecovery(): void {
  if (!recoveryConfig || recoveryTimer) return;
  
  console.log(`[DbAutoRecovery] 🔄 Планируем попытку восстановления через ${currentBackoff}ms`);
  
  recoveryTimer = setTimeout(async () => {
    try {
      // Попытка переподключения через основной модуль БД
      const { testConnection } = await import('../db-connect-unified');
      const isConnected = await testConnection();
      
      if (isConnected) {
        console.log('[DbAutoRecovery] ✅ Соединение с БД восстановлено');
        signalDbSuccess();
      } else {
        console.log('[DbAutoRecovery] ❌ Попытка восстановления неудачна');
        
        // Увеличиваем задержку для следующей попытки
        currentBackoff = Math.min(
          currentBackoff * recoveryConfig!.backoffFactor,
          recoveryConfig!.maxBackoff
        );
        
        recoveryTimer = null;
        scheduleRecovery();
      }
    } catch (error) {
      console.error('[DbAutoRecovery] ❌ Ошибка при попытке восстановления:', error);
      
      // Увеличиваем задержку для следующей попытки
      currentBackoff = Math.min(
        currentBackoff * recoveryConfig!.backoffFactor,
        recoveryConfig!.maxBackoff
      );
      
      recoveryTimer = null;
      scheduleRecovery();
    }
  }, currentBackoff);
}

/**
 * Получает текущее состояние системы восстановления
 */
export function getRecoveryStatus() {
  return {
    isInitialized: recoveryConfig !== null,
    consecutiveFailures,
    currentBackoff,
    lastSuccessTime,
    isRecoveryActive: recoveryTimer !== null
  };
}
/**
 * Модуль автоматического восстановления соединения с базой данных
 */

import logger from './logger';

interface RecoveryResult {
  success: boolean;
  provider?: string;
  error?: string;
  connectionInfo?: any;
}

/**
 * Основная функция восстановления соединения с БД
 */
export async function recoverDatabaseConnection(): Promise<RecoveryResult> {
  logger.info('[DB Recovery] Starting database connection recovery...');
  
  try {
    // Импортируем модули для работы с БД
    const { initializeDatabase, getConnectionStatus, testConnection } = await import('../db-unified');
    
    // Проверяем текущее состояние
    const currentStatus = getConnectionStatus();
    logger.info('[DB Recovery] Current connection status:', currentStatus);
    
    // Если уже подключены и не в memory mode, возвращаем успех
    if (currentStatus.isConnected && !currentStatus.isMemoryMode) {
      logger.info('[DB Recovery] Database already connected, no recovery needed');
      return {
        success: true,
        provider: currentStatus.connectionName,
        connectionInfo: currentStatus
      };
    }
    
    // Пытаемся переинициализировать соединение
    logger.info('[DB Recovery] Attempting database reinitialization...');
    
    try {
      await initializeDatabase();
      
      // Проверяем результат
      const newConnection = await testConnection();
      const newStatus = getConnectionStatus();
      
      if (newConnection && !newStatus.isMemoryMode) {
        logger.info('[DB Recovery] Database recovery successful', {
          provider: newStatus.connectionName,
          isConnected: newStatus.isConnected
        });
        
        return {
          success: true,
          provider: newStatus.connectionName,
          connectionInfo: newStatus
        };
      } else {
        const errorMsg = 'Database reinitialization completed but connection test failed';
        logger.error('[DB Recovery]', errorMsg);
        return {
          success: false,
          error: errorMsg,
          connectionInfo: newStatus
        };
      }
      
    } catch (initError) {
      const errorMsg = `Database initialization failed: ${initError.message}`;
      logger.error('[DB Recovery]', errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    }
    
  } catch (error) {
    const errorMsg = `Recovery process failed: ${error.message}`;
    logger.error('[DB Recovery]', errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Проверка доступности соединения с БД
 */
export async function checkDatabaseHealth(): Promise<{
  isHealthy: boolean;
  details: any;
}> {
  try {
    const { testConnection, getConnectionStatus } = await import('../db-unified');
    
    const isConnected = await testConnection();
    const status = getConnectionStatus();
    
    return {
      isHealthy: isConnected && !status.isMemoryMode,
      details: {
        isConnected,
        isMemoryMode: status.isMemoryMode,
        provider: status.connectionName,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      isHealthy: false,
      details: {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}
