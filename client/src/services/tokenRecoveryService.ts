// Import будет добавлен после проверки существования authService
// import { authService } from './authService';

/**
 * Token Recovery Service
 * 
 * Расширенная система восстановления JWT токенов с fallback механизмами
 * Предотвращает потерю депозитов из-за исчезновения токенов
 */
class TokenRecoveryService {
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_BASE = 1000; // 1 секунда
  private lastRecoveryAttempt = 0;
  private recoveryInProgress = false;

  /**
   * Основной метод восстановления JWT токена
   */
  async recoverJwtToken(): Promise<boolean> {
    if (this.recoveryInProgress) {
      console.log('[TokenRecovery] Восстановление уже в процессе, ожидаем...');
      return false;
    }

    this.recoveryInProgress = true;
    this.lastRecoveryAttempt = Date.now();

    try {
      console.log('[TokenRecovery] Начинаем восстановление JWT токена...');

      // Попытка 1: Refresh существующего токена из localStorage
      const refreshSuccess = await this.attemptTokenRefresh();
      if (refreshSuccess) {
        console.log('[TokenRecovery] ✅ Токен восстановлен через refresh');
        return true;
      }

      // Попытка 2: Создание нового токена через Telegram initData
      const newTokenSuccess = await this.attemptNewTokenCreation();
      if (newTokenSuccess) {
        console.log('[TokenRecovery] ✅ Создан новый токен через Telegram initData');
        return true;
      }

      console.error('[TokenRecovery] ❌ Все попытки восстановления токена провалились');
      return false;

    } catch (error) {
      console.error('[TokenRecovery] ❌ Критическая ошибка восстановления токена:', error);
      return false;
    } finally {
      this.recoveryInProgress = false;
    }
  }

  /**
   * Предупредительное обновление токена (когда он еще действителен, но старый)
   */
  async proactiveTokenRefresh(): Promise<boolean> {
    try {
      console.log('[TokenRecovery] Предупредительное обновление токена...');
      
      const success = await this.attemptTokenRefresh();
      if (success) {
        console.log('[TokenRecovery] ✅ Предупредительное обновление успешно');
        return true;
      } else {
        console.warn('[TokenRecovery] ⚠️ Предупредительное обновление провалилось, но токен еще действителен');
        return false;
      }
    } catch (error) {
      console.error('[TokenRecovery] ❌ Ошибка предупредительного обновления:', error);
      return false;
    }
  }

  /**
   * Попытка обновления токена через существующий refresh mechanism
   */
  private async attemptTokenRefresh(): Promise<boolean> {
    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`[TokenRecovery] Попытка refresh токена ${attempt}/${this.RETRY_ATTEMPTS}`);

        // Прямой вызов API для refresh токена
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('unifarm_jwt_token')}`
          },
          body: JSON.stringify({
            token: localStorage.getItem('unifarm_jwt_token')
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.token) {
            localStorage.setItem('unifarm_jwt_token', data.data.token);
            const refreshed = true;
            if (refreshed) {
              console.log('[TokenRecovery] ✅ Refresh токена успешен');
              return true;
            }
          }
        }

        console.warn(`[TokenRecovery] ⚠️ Refresh токена провалился (попытка ${attempt})`);

      } catch (error) {
        console.error(`[TokenRecovery] ❌ Ошибка refresh токена (попытка ${attempt}):`, error);
      }

      // Exponential backoff между попытками
      if (attempt < this.RETRY_ATTEMPTS) {
        const delay = this.RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }

    return false;
  }

  /**
   * Попытка создания нового токена через Telegram initData
   */
  private async attemptNewTokenCreation(): Promise<boolean> {
    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`[TokenRecovery] Попытка создания нового токена ${attempt}/${this.RETRY_ATTEMPTS}`);

        // Проверяем доступность Telegram WebApp API
        if (!window.Telegram?.WebApp?.initData) {
          console.error('[TokenRecovery] ❌ Telegram initData недоступен');
          continue;
        }

        // Прямой вызов API для создания нового токена
        const response = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': window.Telegram.WebApp.initData
          },
          body: JSON.stringify({
            initData: window.Telegram.WebApp.initData
          })
        });

        if (response.ok) {
          const data = await response.json();
          const newToken = data.success && data.data?.token ? data.data.token : null;
          if (newToken) {
            console.log('[TokenRecovery] ✅ Новый токен создан успешно');
            
            // Сохраняем новый токен
            localStorage.setItem('unifarm_jwt_token', newToken);
            return true;
          }
        }

        console.warn(`[TokenRecovery] ⚠️ Создание нового токена провалилось (попытка ${attempt})`);

      } catch (error) {
        console.error(`[TokenRecovery] ❌ Ошибка создания токена (попытка ${attempt}):`, error);
      }

      // Exponential backoff между попытками
      if (attempt < this.RETRY_ATTEMPTS) {
        const delay = this.RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }

    return false;
  }

  /**
   * Получить возраст JWT токена в миллисекундах
   */
  getTokenAge(token: string): number {
    try {
      // Парсим JWT токен для получения iat (issued at)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const issuedAt = payload.iat * 1000; // Конвертируем в миллисекунды
      return Date.now() - issuedAt;
    } catch (error) {
      console.error('[TokenRecovery] ❌ Ошибка парсинга JWT токена:', error);
      return Infinity; // Считаем токен очень старым если не можем парсить
    }
  }

  /**
   * Проверить, находимся ли мы в критическом временном окне
   */
  isInCriticalWindow(token: string): boolean {
    const age = this.getTokenAge(token);
    const ageMinutes = age / (60 * 1000);
    
    // Критические окна: 25-35, 55-65, 85-95 минут
    return (
      (ageMinutes >= 25 && ageMinutes <= 35) ||
      (ageMinutes >= 55 && ageMinutes <= 65) ||
      (ageMinutes >= 85 && ageMinutes <= 95)
    );
  }

  /**
   * Получить статус восстановления
   */
  getRecoveryStatus() {
    return {
      inProgress: this.recoveryInProgress,
      lastAttempt: this.lastRecoveryAttempt,
      timeSinceLastAttempt: Date.now() - this.lastRecoveryAttempt
    };
  }

  /**
   * Утилита для задержки
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const tokenRecoveryService = new TokenRecoveryService();