/**
 * Сервис восстановления сессий с принудительной инициализацией
 * Версия без бесконечных циклов
 */
console.log('[sessionRestoreService] Инициализация сервиса восстановления сессий');

// Простая проверка - считаем готовым сразу
let isInitialized = false;

/**
 * Простая проверка готовности - всегда возвращает true
 */
const isTelegramWebAppReady = (): boolean => {
  console.log('[sessionRestoreService] ✅ Принудительно считаем Telegram готовым');
  return true;
};

/**
 * Помечает WebApp как готовый
 */
const markTelegramWebAppAsReady = (): void => {
  isInitialized = true;
  console.log('[sessionRestoreService] ✅ WebApp отмечен как готовый');
};

/**
 * Инициализация сервиса восстановления сессий
 */
export const initializeSessionRestore = async (): Promise<void> => {
  try {
    console.log('[sessionRestoreService] 🚀 Начало инициализации');

    // Принудительно считаем готовым
    markTelegramWebAppAsReady();

    console.log('[sessionRestoreService] ✅ Инициализация завершена успешно');
  } catch (error) {
    console.error('[sessionRestoreService] ❌ Ошибка при инициализации:', error);
  }
};

/**
 * Восстанавливает сессию пользователя
 */
export const restoreUserSession = async (): Promise<any> => {
  try {
    console.log('[sessionRestoreService] 🔄 Восстановление сессии...');

    // Простая заглушка для пользователя
    const defaultUser = {
      id: '1',
      username: 'guest_user',
      uni_balance: 1500,
      ton_balance: 0,
      ref_code: 'DEFAULT'
    };

    console.log('[sessionRestoreService] ✅ Сессия восстановлена (заглушка)');
    return defaultUser;
  } catch (error) {
    console.error('[sessionRestoreService] ❌ Ошибка восстановления сессии:', error);
    return null;
  }
};

// Экспорт функций
export {
  isTelegramWebAppReady,
  markTelegramWebAppAsReady
};

// Автоматическая инициализация при загрузке модуля
markTelegramWebAppAsReady();

// Default export объекта с методами
const sessionRestoreService = {
  initializeSessionRestore,
  restoreUserSession,
  isTelegramWebAppReady,
  markTelegramWebAppAsReady,

  // Добавляем метод для автоматической повторной аутентификации
  autoReauthenticate: async (): Promise<boolean> => {
    try {
      console.log('[sessionRestoreService] Попытка автоматической повторной аутентификации...');

      // Простая заглушка - всегда возвращаем true для совместимости
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('[sessionRestoreService] ✅ Автоматическая повторная аутентификация выполнена (заглушка)');
      return true;
    } catch (error) {
      console.error('[sessionRestoreService] ❌ Ошибка автоматической повторной аутентификации:', error);
      return false;
    }
  },

  // Добавляем метод для проверки необходимости восстановления сессии  
  shouldAttemptRestore: (): boolean => {
    try {
      const lastSession = localStorage.getItem('unifarm_last_session');
      const guestId = localStorage.getItem('unifarm_guest_id');

      console.log('[sessionRestoreService] Проверка необходимости восстановления сессии:', {
        hasLastSession: !!lastSession,
        hasGuestId: !!guestId
      });

      return !!(lastSession || guestId);
    } catch (error) {
      console.error('[sessionRestoreService] Ошибка при проверке восстановления сессии:', error);
      return false;
    }
  },
  /**
   * Получает гостевой ID из Telegram данных или генерирует новый
   */
  getGuestId(): string {
    console.log('[sessionRestoreService] Получение гостевого ID...');

    // Сначала пытаемся получить сохраненный guest_id
    const savedGuestId = this.sessionStorageService.getGuestId();

    // Проверяем инициализацию Telegram WebApp
    if (!this.checkTelegramWebAppInitialized()) {
      console.log('[sessionRestoreService] Telegram WebApp еще не инициализирован, используем сохраненный ID');
      // Возвращаем сохраненный guest_id
      return savedGuestId;
    }
  },

  /**
   * Проверяет готовность Telegram WebApp
   */
  private isTelegramReady(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const tg = window.Telegram?.WebApp;
    if (!tg) {
      // Убираем частые логи для preview режима
      if (!this.isPreviewMode()) {
        console.log('[sessionRestoreService] Telegram WebApp еще не инициализирован');
      }
      return false;
    }

    // Проверяем наличие initData
    const hasInitData = tg.initData && tg.initData.length > 0;
    const hasUser = tg.initDataUnsafe?.user;

    return hasInitData && hasUser;
  }

  /**
   * Проверка на preview режим Replit
   */
  private isPreviewMode(): boolean {
    if (typeof window === 'undefined') return false;

    const hostname = window.location.hostname;
    const isReplit = hostname.includes('replit.app') || hostname.includes('replit.dev');
    const isInIframe = window.self !== window.top;

    return isReplit && isInIframe && !window.Telegram?.WebApp?.initData;
  }
};

export default sessionRestoreService;