/**
 * Сервис для управления идентификаторами гостевых пользователей
 * Это часть новой архитектуры, позволяющей приложению работать вне Telegram
 */

const GUEST_ID_STORAGE_KEY = 'unifarm_guest_id';

/**
 * Проверяет наличие guest_id в локальном хранилище
 * @returns {boolean} true если guest_id существует в localStorage
 */
export function hasGuestId(): boolean {
  try {
    return !!localStorage.getItem(GUEST_ID_STORAGE_KEY);
  } catch (error) {
    console.error('[guestIdService] Ошибка при проверке наличия guest_id:', error);
    return false;
  }
}

/**
 * Получает существующий guest_id из локального хранилища
 * @returns {string|null} guest_id или null, если его нет
 */
export function getGuestId(): string | null {
  try {
    return localStorage.getItem(GUEST_ID_STORAGE_KEY);
  } catch (error) {
    console.error('[guestIdService] Ошибка при получении guest_id:', error);
    return null;
  }
}

/**
 * Сохраняет guest_id в локальное хранилище
 * @param {string} guestId - уникальный идентификатор гостя
 * @returns {boolean} true если операция прошла успешно
 */
export function saveGuestId(guestId: string): boolean {
  try {
    localStorage.setItem(GUEST_ID_STORAGE_KEY, guestId);
    return true;
  } catch (error) {
    console.error('[guestIdService] Ошибка при сохранении guest_id:', error);
    return false;
  }
}

/**
 * Создает и сохраняет новый guest_id, использует UUID v4
 * @returns {string|null} новый guest_id или null в случае ошибки
 */
export function createGuestId(): string | null {
  try {
    // Проверяем, есть ли уже guest_id
    if (hasGuestId()) {
      console.log('[guestIdService] guest_id уже существует, используем существующий');
      return getGuestId();
    }

    // Генерируем UUID v4
    // На клиенте мы можем использовать crypto.randomUUID() в современных браузерах
    // или Math.random() с преобразованием в UUID-подобную строку как запасной вариант
    let guestId: string;
    
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      guestId = window.crypto.randomUUID();
    } else {
      // Запасной вариант для старых браузеров
      guestId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
    console.log('[guestIdService] Создан новый guest_id:', guestId);
    
    // Сохраняем в localStorage
    saveGuestId(guestId);
    
    return guestId;
  } catch (error) {
    console.error('[guestIdService] Ошибка при создании guest_id:', error);
    return null;
  }
}

/**
 * Получает или создает guest_id
 * Эта функция гарантирует, что будет возвращен действительный guest_id
 * @returns {string} существующий или новый guest_id
 */
export function getOrCreateGuestId(): string {
  const existingGuestId = getGuestId();
  
  if (existingGuestId) {
    return existingGuestId;
  }
  
  const newGuestId = createGuestId();
  
  if (!newGuestId) {
    console.error('[guestIdService] Не удалось создать guest_id, возвращаем временный идентификатор');
    // В крайнем случае генерируем простой временный идентификатор
    // Это позволит приложению продолжить работу, хотя не идеальное решение
    return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }
  
  return newGuestId;
}

/**
 * Удаляет guest_id из локального хранилища
 * @returns {boolean} true если операция прошла успешно
 */
export function clearGuestId(): boolean {
  try {
    localStorage.removeItem(GUEST_ID_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('[guestIdService] Ошибка при удалении guest_id:', error);
    return false;
  }
}

/**
 * Расширенный способ получения идентификатора пользователя,
 * учитывающий как Telegram ID (если доступен), так и guest_id
 * @returns {Object} Объект, содержащий информацию о пользовательском ID
 */
export function getUserIdentifier(): { 
  hasTelegramId: boolean, 
  hasGuestId: boolean, 
  telegramId?: number | null, 
  guestId: string 
} {
  // Импортируем функцию для получения Telegram ID
  // Оставляем динамическим импортом, чтобы избежать циклических зависимостей
  const telegramService = require('./telegramService');
  
  // Получаем Telegram ID, если доступен
  const telegramId = telegramService.getCachedTelegramUserId();
  const hasTelegramId = !!telegramId && telegramId !== '0' && telegramId !== 'null';
  
  // Всегда получаем или создаем guest_id
  const guestId = getOrCreateGuestId();
  
  return {
    hasTelegramId,
    hasGuestId: !!guestId,
    telegramId: hasTelegramId ? Number(telegramId) : null,
    guestId
  };
}

export default {
  hasGuestId,
  getGuestId,
  saveGuestId,
  createGuestId,
  getOrCreateGuestId,
  clearGuestId,
  getUserIdentifier
};