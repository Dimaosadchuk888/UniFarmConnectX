import { tokenRecoveryService } from '../services/tokenRecoveryService';

/**
 * Critical Operation Guard
 * 
 * Защищает критические операции (депозиты, выводы) от JWT token timeout
 * Проверяет и обновляет токены перед выполнением операций
 */
class CriticalOperationGuard {
  private readonly CRITICAL_AGE_THRESHOLD = 25 * 60 * 1000; // 25 минут
  private readonly OPERATION_TIMEOUT = 30000; // 30 секунд

  /**
   * Основной метод защиты критических операций
   */
  async guardCriticalOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    console.log(`[CriticalGuard] Начинаем защищенную операцию: ${operationName}`);

    try {
      // Шаг 1: Проверяем наличие и состояние JWT токена
      await this.ensureValidToken(operationName);

      // Шаг 2: Выполняем операцию с timeout protection
      const result = await this.executeWithTimeout(operation, operationName);

      console.log(`[CriticalGuard] ✅ Операция ${operationName} выполнена успешно`);
      return result;

    } catch (error) {
      console.error(`[CriticalGuard] ❌ Ошибка в операции ${operationName}:`, error);
      throw error;
    }
  }

  /**
   * Проверяет и обеспечивает валидность JWT токена
   */
  private async ensureValidToken(operationName: string): Promise<void> {
    const currentToken = localStorage.getItem('unifarm_jwt_token');

    // Проверка 1: Токен отсутствует
    if (!currentToken) {
      console.warn(`[CriticalGuard] 🚨 JWT токен отсутствует перед операцией ${operationName}`);
      
      const recovered = await tokenRecoveryService.recoverJwtToken();
      if (!recovered) {
        throw new Error(`Не удалось восстановить JWT токен для операции ${operationName}`);
      }
      
      console.log(`[CriticalGuard] ✅ JWT токен восстановлен для операции ${operationName}`);
      return;
    }

    // Проверка 2: Токен слишком старый
    const tokenAge = tokenRecoveryService.getTokenAge(currentToken);
    if (tokenAge > this.CRITICAL_AGE_THRESHOLD) {
      const ageMinutes = Math.round(tokenAge / 60000);
      console.warn(`[CriticalGuard] ⚠️ JWT токен слишком старый (${ageMinutes} мин) для операции ${operationName}`);
      
      const refreshed = await tokenRecoveryService.proactiveTokenRefresh();
      if (!refreshed) {
        console.warn(`[CriticalGuard] ⚠️ Не удалось обновить токен, но продолжаем с текущим`);
      }
    }

    // Проверка 3: Критическое временное окно
    if (tokenRecoveryService.isInCriticalWindow(currentToken)) {
      const ageMinutes = Math.round(tokenAge / 60000);
      console.warn(`[CriticalGuard] 🚨 Операция ${operationName} в критическом окне (${ageMinutes} мин)!`);
      
      // Принудительно обновляем токен в критических окнах
      await tokenRecoveryService.proactiveTokenRefresh();
    }

    console.log(`[CriticalGuard] ✅ JWT токен валиден для операции ${operationName}`);
  }

  /**
   * Выполняет операцию с timeout protection
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Timeout protection
      const timeoutId = setTimeout(() => {
        reject(new Error(`Операция ${operationName} превысила timeout ${this.OPERATION_TIMEOUT}ms`));
      }, this.OPERATION_TIMEOUT);

      // Выполняем операцию
      operation()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Специализированная защита для TON депозитов
   */
  async guardTonDeposit<T>(depositOperation: () => Promise<T>): Promise<T> {
    console.log('[CriticalGuard] 🔒 Защита TON депозита активирована');
    
    // Дополнительная проверка для TON операций
    const currentToken = localStorage.getItem('unifarm_jwt_token');
    if (currentToken) {
      const tokenAge = tokenRecoveryService.getTokenAge(currentToken);
      const ageMinutes = Math.round(tokenAge / 60000);
      
      console.log(`[CriticalGuard] TON депозит - возраст токена: ${ageMinutes} минут`);
      
      // Если токен старше 20 минут - принудительно обновляем
      if (tokenAge > 20 * 60 * 1000) {
        console.log('[CriticalGuard] Принудительное обновление токена перед TON депозитом');
        await tokenRecoveryService.proactiveTokenRefresh();
      }
    }

    return this.guardCriticalOperation(depositOperation, 'TON_DEPOSIT');
  }

  /**
   * Специализированная защита для выводов средств
   */
  async guardWithdrawal<T>(withdrawalOperation: () => Promise<T>): Promise<T> {
    console.log('[CriticalGuard] 🔒 Защита вывода средств активирована');
    
    return this.guardCriticalOperation(withdrawalOperation, 'WITHDRAWAL');
  }

  /**
   * Проверка готовности к критическим операциям
   */
  async checkOperationReadiness(): Promise<{
    ready: boolean;
    tokenAge: number;
    inCriticalWindow: boolean;
    recommendation: string;
  }> {
    const currentToken = localStorage.getItem('unifarm_jwt_token');
    
    if (!currentToken) {
      return {
        ready: false,
        tokenAge: Infinity,
        inCriticalWindow: false,
        recommendation: 'JWT токен отсутствует. Требуется восстановление.'
      };
    }

    const tokenAge = tokenRecoveryService.getTokenAge(currentToken);
    const ageMinutes = Math.round(tokenAge / 60000);
    const inCriticalWindow = tokenRecoveryService.isInCriticalWindow(currentToken);

    let recommendation = 'Готов к операциям';
    let ready = true;

    if (tokenAge > this.CRITICAL_AGE_THRESHOLD) {
      recommendation = `Токен старый (${ageMinutes} мин). Рекомендуется обновление.`;
      ready = false;
    }

    if (inCriticalWindow) {
      recommendation = `Критическое окно (${ageMinutes} мин). Обязательно обновить токен.`;
      ready = false;
    }

    return {
      ready,
      tokenAge,
      inCriticalWindow,
      recommendation
    };
  }
}

export const criticalOperationGuard = new CriticalOperationGuard();