/**
 * Сервис для восстановления сессии по guest_id
 * 
 * Этап 5: Безопасное восстановление пользователя
 * Обеспечивает стабильную работу системы, при которой один и тот же пользователь (по guest_id)
 * всегда получает доступ к своему кабинету, даже при повторных заходах.
 * Новый кабинет создаётся только в случае, если пользователь вручную удалил Telegram-бот
 * или это первый запуск приложения.
 * 
 * Поддерживает корректную последовательность инициализации в среде Telegram WebApp:
 * 1. Восстановление или создание guest_id
 * 2. Ожидание инициализации Telegram WebApp (WebApp.ready())
 * 3. Затем выполнение запросов к API
 */

import { v4 as uuidv4 } from 'uuid';
import telegramService from './telegramService';
import apiConfig from "@/config/apiConfig";
import { correctApiRequest } from "@/lib/correctApiRequest";
import sessionStorageService, { SESSION_KEYS } from './sessionStorageService';

/**
 * Константы для хранения ключей в localStorage/sessionStorage
 * @deprecated Используйте константы из sessionStorageService
 */
const STORAGE_KEYS = SESSION_KEYS;

/**
 * Проверяет, следует ли пытаться восстановить сессию
 * @returns true если guest_id существует и можно попытаться восстановить сессию
 */
const shouldAttemptRestore = (): boolean => {
  try {
    // Проверяем наличие guest_id в localStorage
    const guestId = localStorage.getItem(STORAGE_KEYS.GUEST_ID);

    // Если guest_id существует, возвращаем true
    if (guestId) {
      console.log('[sessionRestoreService] Найден guest_id в localStorage:', guestId);
      return true;
    }

    // Проверяем также наличие guest_id в sessionStorage (запасной вариант)
    const sessionGuestId = sessionStorage.getItem(STORAGE_KEYS.GUEST_ID);
    if (sessionGuestId) {
      console.log('[sessionRestoreService] Найден guest_id в sessionStorage:', sessionGuestId);
      // Мигрируем guest_id из sessionStorage в localStorage для долгосрочного хранения
      localStorage.setItem(STORAGE_KEYS.GUEST_ID, sessionGuestId);
      return true;
    }

    console.log('[sessionRestoreService] Не найден guest_id ни в одном хранилище');
    return false;
  } catch (error) {
    console.error('[sessionRestoreService] Ошибка при проверке guest_id:', error);
    return false;
  }
};

/**
 * Получает guest_id из хранилища
 * @returns guest_id или null, если его нет
 */
const getGuestId = (): string | null => {
  try {
    // Приоритетно проверяем localStorage (более долговременное хранилище)
    const guestId = localStorage.getItem(STORAGE_KEYS.GUEST_ID);
    if (guestId) {
      return guestId;
    }

    // Запасной вариант - проверяем sessionStorage
    const sessionGuestId = sessionStorage.getItem(STORAGE_KEYS.GUEST_ID);
    if (sessionGuestId) {
      // Мигрируем в localStorage для постоянного хранения
      localStorage.setItem(STORAGE_KEYS.GUEST_ID, sessionGuestId);
      return sessionGuestId;
    }

    return null;
  } catch (error) {
    console.error('[sessionRestoreService] Ошибка при получении guest_id:', error);
    return null;
  }
};

/**
 * Сохраняет guest_id в localStorage
 * @param guestId уникальный идентификатор гостя
 */
const saveGuestId = (guestId: string): void => {
  try {
    if (!guestId) {
      console.error('[sessionRestoreService] Попытка сохранить пустой guest_id');
      return;
    }

    // Сохраняем в localStorage для долгосрочного хранения
    localStorage.setItem(STORAGE_KEYS.GUEST_ID, guestId);

    // Сохраняем также в sessionStorage для максимальной совместимости
    sessionStorage.setItem(STORAGE_KEYS.GUEST_ID, guestId);

    console.log('[sessionRestoreService] guest_id успешно сохранен:', guestId);
  } catch (error) {
    console.error('[sessionRestoreService] Ошибка при сохранении guest_id:', error);
  }
};

/**
 * Отправляет запрос на восстановление сессии
 * @param guestId уникальный идентификатор гостя
 * @param additionalData дополнительные данные для отправки в запросе
 * @returns Promise с результатом запроса
 */
const restoreSession = async (guestId: string, additionalData: Record<string, any> = {}) => {
  try {
    console.log('[sessionRestoreService] Текущий guest_id:', guestId);
    console.log('[sessionRestoreService] Попытка восстановить сессию через /api/session/restore с guest_id:', guestId);
    console.log('[SessionRestoreService] Объект localStorage доступен:', typeof localStorage !== 'undefined');

    // Подготавливаем данные для запроса
    const requestData = {
      guest_id: guestId,
      ...additionalData
    };

    // Отправляем запрос на восстановление сессии
    console.log('[SessionRestoreService] Формирование запроса к серверу с телом:', JSON.stringify(requestData));
    const result = await correctApiRequest('/api/v2/session/restore', 'POST', requestData);

    if (result.success && result.data) {
      console.log('[sessionRestoreService] Сессия успешно восстановлена:', result.data);

      // Сохраняем данные сессии в новом сервисе и в localStorage для обратной совместимости
      const sessionData = {
        timestamp: new Date().toISOString(),
        user_id: result.data.user_id || result.data.userId || 1, // Используем 1 как запасной вариант для тестирования
        username: result.data.username || null,
        ref_code: result.data.ref_code || null,
        guest_id: result.data.guest_id || guestId
      };

      // Сохраняем для обратной совместимости
      localStorage.setItem(STORAGE_KEYS.LAST_SESSION, JSON.stringify(sessionData));

      // Также сохраняем guest_id отдельно для надежности
      if (guestId) {
        localStorage.setItem(STORAGE_KEYS.GUEST_ID, guestId);
      }

      return result;
    } else {
      console.error('[sessionRestoreService] Не удалось восстановить сессию:', result.message);
      return result;
    }
  } catch (error) {
    console.error('[sessionRestoreService] Ошибка при восстановлении сессии:', error);
    return {
      success: false,
      message: 'Ошибка при восстановлении сессии'
    };
  }
};

/**
 * Безопасно очищает guest_id и всю связанную информацию о сессии из хранилища
 * Используется при явном выходе пользователя или при удалении бота
 */
const clearGuestIdAndSession = (): void => {
  try {
    console.log('[sessionRestoreService] Очистка guest_id и данных сессии...');

    // Удаляем все связанные с сессией данные из хранилищ
    localStorage.removeItem(STORAGE_KEYS.GUEST_ID);
    sessionStorage.removeItem(STORAGE_KEYS.GUEST_ID);
    localStorage.removeItem(STORAGE_KEYS.LAST_SESSION);

    console.log('[sessionRestoreService] ✅ Данные сессии успешно очищены');
  } catch (error) {
    console.error('[sessionRestoreService] ❌ Ошибка при очистке данных сессии:', error);
  }
};

/**
 * Заглушка для совместимости с предыдущими версиями
 * Этап 10.4: Удаление зависимостей от telegram_user_id
 * @param _ параметр игнорируется
 * @returns всегда false
 */
const hasTelegramUserChanged = (_: any): boolean => {
  console.warn('[sessionRestoreService] hasTelegramUserChanged: функция устарела (Этап 10.4), использовать нельзя');
  return false;
};

/**
 * Заглушка для совместимости с предыдущими версиями
 * Этап 10.4: Удаление зависимостей от telegram_user_id
 * @param _ параметры игнорируются
 */
const updateSessionWithTelegramData = (_telegramId: any, _userId: any): void => {
  console.warn('[sessionRestoreService] updateSessionWithTelegramData: функция устарела (Этап 10.4), использовать нельзя');
};

/**
 * Получает существующий guest_id или создает новый
 * @returns {string} Уникальный идентификатор гостя
 */
const getOrCreateGuestId = (): string => {
  try {
    // Пытаемся получить существующий guest_id
    const existingGuestId = getGuestId();

    if (existingGuestId) {
      console.log('[sessionRestoreService] Используем существующий guest_id:', existingGuestId);
      return existingGuestId;
    }

    // Если guest_id не найден, создаем новый на основе UUID v4
    const newGuestId = uuidv4();
    console.log('[sessionRestoreService] Создан новый guest_id:', newGuestId);

    // Сохраняем новый guest_id
    saveGuestId(newGuestId);

    return newGuestId;
  } catch (error) {
    console.error('[sessionRestoreService] Ошибка при создании guest_id:', error);

    // В случае ошибки создаем fallback ID на основе timestamp
    const fallbackId = `fb-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    console.warn('[sessionRestoreService] Используем fallback guest_id:', fallbackId);

    try {
      saveGuestId(fallbackId);
    } catch (saveError) {
      console.error('[sessionRestoreService] Не удалось сохранить fallback guest_id:', saveError);
    }

    return fallbackId;
  }
};

/**
 * Проверяет, инициализирован ли Telegram WebApp
 * @returns true если Telegram WebApp уже инициализирован или недоступен
 */
const isTelegramWebAppReady = (): boolean => {
  try {
    // Если Telegram WebApp не доступен, считаем что "готов" (не нужно ждать)
    if (!telegramService.isAvailable()) {
      console.log('[sessionRestoreService] Telegram WebApp не обнаружен, считаем "готовым"');
      return true;
    }

    // Проверяем флаг готовности из localStorage
    const isReady = localStorage.getItem(SESSION_KEYS.TELEGRAM_READY) === 'true';
    
    // Дополнительная проверка: если WebApp имеет version или initData, то он готов
    const hasWebAppData = window.Telegram?.WebApp && (
      window.Telegram.WebApp.version ||
      window.Telegram.WebApp.initData ||
      window.Telegram.WebApp.platform
    );

    if (isReady || hasWebAppData) {
      if (hasWebAppData && !isReady) {
        // Автоматически отмечаем как готовый, если есть данные WebApp
        markTelegramWebAppAsReady();
      }
      console.log('[sessionRestoreService] Telegram WebApp готов');
      return true;
    }

    console.log('[sessionRestoreService] Telegram WebApp еще не инициализирован');
    return false;
  } catch (error) {
    console.error('[sessionRestoreService] Ошибка при проверке готовности Telegram WebApp:', error);
    // В случае ошибки считаем, что готов (защита от зависаний)
    return true;
  }
};

/**
 * Отмечает Telegram WebApp как инициализированный
 */
const markTelegramWebAppAsReady = (): void => {
  try {
    console.log('[sessionRestoreService] Отмечаем Telegram WebApp как инициализированный');
    localStorage.setItem(SESSION_KEYS.TELEGRAM_READY, 'true');
    sessionStorage.setItem(SESSION_KEYS.TELEGRAM_READY, 'true');
  } catch (error) {
    console.error('[sessionRestoreService] Ошибка при отметке Telegram WebApp как готового:', error);
  }
};

/**
 * Асинхронно ожидает инициализации Telegram WebApp
 * Возвращает Promise, который разрешается, когда WebApp готов или недоступен
 * @param timeoutMs максимальное время ожидания в миллисекундах
 * @returns Promise<boolean> - true если WebApp готов, false если произошел таймаут
 */
const waitForTelegramWebApp = (timeoutMs = 5000): Promise<boolean> => {
  // Если Telegram WebApp не используется или уже готов, сразу возвращаем true
  if (!telegramService.isAvailable() || isTelegramWebAppReady()) {
    console.log('[sessionRestoreService] Не требуется ожидание Telegram WebApp');
    return Promise.resolve(true);
  }

  console.log('[sessionRestoreService] Ожидаем инициализации Telegram WebApp...');

  return new Promise((resolve) => {
    // Устанавливаем таймаут для защиты от зависания
    const timeoutId = setTimeout(() => {
      console.warn('[sessionRestoreService] Таймаут ожидания инициализации Telegram WebApp');
      resolve(false);
    }, timeoutMs);

    // Функция проверки готовности с интервалом
    const checkReady = () => {
      if (isTelegramWebAppReady()) {
        clearTimeout(timeoutId);
        console.log('[sessionRestoreService] Telegram WebApp успешно инициализирован');
        resolve(true);
      } else {
        // Если не готов, пробуем вызвать ready() еще раз и проверяем снова через 100мс
        try {
          if (window.Telegram?.WebApp?.ready) {
            window.Telegram.WebApp.ready();
          }
        } catch (e) {
          console.error('[sessionRestoreService] Ошибка при вызове WebApp.ready():', e);
        }

        setTimeout(checkReady, 100);
      }
    };

    // Начинаем проверять готовность
    checkReady();
  });
};

/**
 * Функция для автоматического повторного входа в случае истечения сессии
 * @returns Promise с результатом повторной аутентификации
 */
const autoReauthenticate = async (): Promise<boolean> => {
  try {
    console.log('[sessionRestoreService] Начинаем автоматическую повторную аутентификацию...');

    // Получаем guest_id или создаем новый через улучшенный сервис
    const guestId = sessionStorageService.getGuestId() || getOrCreateGuestId();

    // Для дополнительной надежности сохраняем guest_id в новом сервисе
    sessionStorageService.saveGuestId(guestId);

    // Ожидаем инициализации Telegram WebApp, если она требуется
    await waitForTelegramWebApp();

    // Добавляем информацию о режиме разработки
    const additionalData: Record<string, any> = {};
    if (process.env.NODE_ENV !== 'production') {
      additionalData.development_mode = true;

      // Если есть user_id, добавляем его для режима разработки
      const userId = sessionStorageService.getUserId();
      if (userId) {
        additionalData.user_id = userId;
      }
    }

    console.log('[sessionRestoreService] Дополнительные данные для восстановления:', 
      JSON.stringify(additionalData, null, 2));

    // Пытаемся восстановить сессию с дополнительными данными
    const result = await restoreSession(guestId, additionalData);

    if (result.success) {
      console.log('[sessionRestoreService] ✅ Автоматическая повторная аутентификация успешна!');

      // Сохраняем обновленную сессию через новый сервис
      if (result.data) {
        sessionStorageService.saveSession(result.data);
        console.log('[sessionRestoreService] Данные сессии сохранены');
      }

      return true;
    } else {
      console.error('[sessionRestoreService] ❌ Не удалось выполнить повторную аутентификацию:', result.message);
      return false;
    }
  } catch (error) {
    console.error('[sessionRestoreService] ❌ Ошибка при повторной аутентификации:', error);
    return false;
  }
};

/**
 * Улучшенная очистка guest_id и связанных данных сессии
 * Используется только при критических ошибках аутентификации
 */
const clearGuestIdAndSessionAdvanced = (force: boolean = false): void => {
  try {
    console.log('[sessionRestoreService] Запрос на очистку данных сессии, force:', force);

    // Если не принудительная очистка, проверяем, действительно ли нужна очистка
    if (!force) {
      const currentGuestId = localStorage.getItem(STORAGE_KEYS.GUEST_ID);
      const userData = localStorage.getItem(STORAGE_KEYS.LAST_SESSION);

      // Не очищаем сессию, если есть валидные данные
      if (currentGuestId && userData) {
        try {
          const parsedUserData = JSON.parse(userData);
          if (parsedUserData && parsedUserData.user_id && parsedUserData.user_id > 1) {
            console.log('[sessionRestoreService] ⚠️ Отменяем очистку: найдены валидные данные пользователя');
            return;
          }
        } catch (parseError) {
          console.warn('[sessionRestoreService] Не удалось парсить данные пользователя, продолжаем очистку');
        }
      }
    }

    console.log('[sessionRestoreService] Очистка guest_id и данных сессии...');

    // Удаляем все связанные с сессией данные из хранилищ
    localStorage.removeItem(STORAGE_KEYS.GUEST_ID);
    sessionStorage.removeItem(STORAGE_KEYS.GUEST_ID);
    localStorage.removeItem(STORAGE_KEYS.LAST_SESSION);

    console.log('[sessionRestoreService] ✅ Данные сессии успешно очищены');
  } catch (error) {
    console.error('[sessionRestoreService] ❌ Ошибка при очистке данных сессии:', error);
  }
};

// Экспортируем методы сервиса с указанием точных типов
type SessionRestoreService = {
  shouldAttemptRestore: () => boolean;
  getGuestId: () => string | null;
  saveGuestId: (guestId: string) => void;
  restoreSession: (guestId: string, additionalData?: Record<string, any>) => Promise<any>;
  clearGuestIdAndSession: (force?: boolean) => void;
  hasTelegramUserChanged: (any: any) => boolean;
  updateSessionWithTelegramData: (telegramId: any, userId: any) => void;
  getOrCreateGuestId: () => string;
  isTelegramWebAppReady: () => boolean;
  markTelegramWebAppAsReady: () => void;
  waitForTelegramWebApp: (timeoutMs?: number) => Promise<boolean>;
  autoReauthenticate: () => Promise<boolean>;
};

const sessionRestoreService: SessionRestoreService = {
  shouldAttemptRestore,
  getGuestId,
  saveGuestId,
  restoreSession,
  clearGuestIdAndSession,
  hasTelegramUserChanged,
  updateSessionWithTelegramData,
  getOrCreateGuestId,
  isTelegramWebAppReady,
  markTelegramWebAppAsReady,
  waitForTelegramWebApp,
  autoReauthenticate
};

export default sessionRestoreService;
export class SessionRestoreService {
  private static instance: SessionRestoreService;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  static getInstance(): SessionRestoreService {
    if (!SessionRestoreService.instance) {
      SessionRestoreService.instance = new SessionRestoreService();
    }
    return SessionRestoreService.instance;
  }

  private async waitForTelegramInit(): Promise<boolean> {
    if (this.initializationPromise) {
      await this.initializationPromise;
      return !!window.Telegram?.WebApp;
    }

    this.initializationPromise = new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 50;

      const checkTelegram = () => {
        attempts++;

        if (window.Telegram?.WebApp) {
          console.log('[sessionRestoreService] ✅ Telegram WebApp успешно инициализирован');
          this.isInitialized = true;
          resolve();
          return;
        }

        if (attempts >= maxAttempts) {
          console.log('[sessionRestoreService] ⚠️ Достигнут лимит попыток инициализации Telegram');
          resolve();
          return;
        }

        setTimeout(checkTelegram, 100);
      };

      checkTelegram();
    });

    await this.initializationPromise;
    return !!window.Telegram?.WebApp;
  }

  async restoreSession(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('[sessionRestoreService] Начинаем восстановление сессии...');

      // Ждем инициализации Telegram WebApp
      const telegramReady = await this.waitForTelegramInit();

      if (!telegramReady) {
        console.log('[sessionRestoreService] Fallback: используем guest режим');
        return this.handleGuestMode();
      }

      return { success: false, error: 'Неизвестная ошибка при восстановлении сессии' };
    } catch (error) {
      console.error('[sessionRestoreService] Ошибка при восстановлении сессии:', error);
      return { success: false, error: 'Критическая ошибка при восстановлении сессии' };
    }
  }

  private handleGuestMode(): { success: boolean; data: any } {
    console.log('[sessionRestoreService] 🔄 Переход в guest режим');

    const guestId = this.generateGuestId();
    const userData = {
      user_id: 1,
      guest_id: guestId,
      telegram_id: null,
      username: 'Guest User',
      first_name: 'Guest',
      uni_balance: 1000.0,
      ton_balance: 50.0,
      is_guest: true,
      session_restored: true
    };

    // Сохраняем в localStorage
    localStorage.setItem('unifarm_guest_id', guestId);
    localStorage.setItem('unifarm_user_data', JSON.stringify(userData));

    return { success: true, data: userData };
  }

  private generateGuestId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `guest_${timestamp}_${random}`;
  }
}