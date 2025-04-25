/**
 * Сервис для восстановления сессии по guest_id
 * 
 * Этап 5: Безопасное восстановление пользователя
 * Обеспечивает стабильную работу системы, при которой один и тот же пользователь (по guest_id)
 * всегда получает доступ к своему кабинету, даже при повторных заходах.
 * Новый кабинет создаётся только в случае, если пользователь вручную удалил Telegram-бот
 * или это первый запуск приложения.
 */

import { apiRequest } from "@/lib/queryClient";
import { v4 as uuidv4 } from 'uuid';

/**
 * Константы для хранения ключей в localStorage/sessionStorage
 */
const STORAGE_KEYS = {
  GUEST_ID: 'unifarm_guest_id',
  LAST_SESSION: 'unifarm_last_session'
};

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
 * @returns Promise с результатом запроса
 */
const restoreSession = async (guestId: string) => {
  try {
    console.log('[sessionRestoreService] Отправка запроса на восстановление сессии с guest_id:', guestId);
    
    // Отправляем запрос на восстановление сессии
    const result = await apiRequest('/api/session/restore', {
      method: 'POST',
      body: JSON.stringify({ guest_id: guestId })
    });
    
    if (result.success && result.data) {
      console.log('[sessionRestoreService] Сессия успешно восстановлена:', result.data);
      
      // Сохраняем информацию о последней сессии
      localStorage.setItem(STORAGE_KEYS.LAST_SESSION, JSON.stringify({
        timestamp: new Date().toISOString(),
        user_id: result.data.user_id
      }));
      
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
 * Проверяет, изменился ли Telegram пользователь
 * Сравнивает текущий telegram_id с тем, который был в последней сессии
 * @param currentTelegramId текущий ID пользователя Telegram
 * @returns true если пользователь изменился, false если тот же или данные отсутствуют
 */
const hasTelegramUserChanged = (currentTelegramId: number | null): boolean => {
  try {
    if (!currentTelegramId) {
      console.log('[sessionRestoreService] Невозможно проверить изменение пользователя: отсутствует текущий Telegram ID');
      return false;
    }
    
    // Получаем последнюю сохраненную сессию
    const lastSessionJson = localStorage.getItem(STORAGE_KEYS.LAST_SESSION);
    if (!lastSessionJson) {
      console.log('[sessionRestoreService] Нет сохраненной информации о последней сессии');
      return false;
    }
    
    try {
      const lastSession = JSON.parse(lastSessionJson);
      if (lastSession && lastSession.telegram_id) {
        // Проверяем, изменился ли ID пользователя Telegram
        const lastTelegramId = Number(lastSession.telegram_id);
        
        if (lastTelegramId !== currentTelegramId) {
          console.log(`[sessionRestoreService] ⚠️ Обнаружена смена пользователя Telegram: было ${lastTelegramId}, стало ${currentTelegramId}`);
          return true;
        } else {
          console.log(`[sessionRestoreService] ✅ Пользователь Telegram не изменился: ID=${currentTelegramId}`);
          return false;
        }
      }
    } catch (parseError) {
      console.error('[sessionRestoreService] Ошибка при разборе данных о последней сессии:', parseError);
    }
    
    return false;
  } catch (error) {
    console.error('[sessionRestoreService] Ошибка при проверке изменения пользователя Telegram:', error);
    return false;
  }
};

/**
 * Обновляет информацию о последней сессии с данными пользователя Telegram
 * @param telegramId ID пользователя Telegram
 * @param userId ID пользователя в системе
 */
const updateSessionWithTelegramData = (telegramId: number, userId: number): void => {
  try {
    if (!telegramId || !userId) {
      console.warn('[sessionRestoreService] Отсутствуют данные для обновления сессии');
      return;
    }
    
    // Сохраняем расширенную информацию о последней сессии
    localStorage.setItem(STORAGE_KEYS.LAST_SESSION, JSON.stringify({
      timestamp: new Date().toISOString(),
      user_id: userId,
      telegram_id: telegramId
    }));
    
    console.log(`[sessionRestoreService] ✅ Сессия обновлена с данными пользователя Telegram: ID=${telegramId}`);
  } catch (error) {
    console.error('[sessionRestoreService] Ошибка при обновлении данных сессии:', error);
  }
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

// Экспортируем методы сервиса
const sessionRestoreService = {
  shouldAttemptRestore,
  getGuestId,
  saveGuestId,
  restoreSession,
  clearGuestIdAndSession,
  hasTelegramUserChanged,
  updateSessionWithTelegramData,
  getOrCreateGuestId
};

export default sessionRestoreService;