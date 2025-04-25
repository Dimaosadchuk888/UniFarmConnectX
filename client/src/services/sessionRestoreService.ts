/**
 * Сервис для восстановления сессии по guest_id
 * 
 * Этап 3: Восстановление кабинета по guest_id
 * Позволяет восстановить сессию пользователя на основе сохраненного guest_id
 * для предотвращения создания дублирующих аккаунтов.
 */

import { apiRequest } from "@/lib/queryClient";

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

// Экспортируем методы сервиса
const sessionRestoreService = {
  shouldAttemptRestore,
  getGuestId,
  saveGuestId,
  restoreSession
};

export default sessionRestoreService;