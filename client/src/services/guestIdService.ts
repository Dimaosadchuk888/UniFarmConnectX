/**
 * Сервис для управления уникальным идентификатором гостя (guest_id)
 * Позволяет приложению работать независимо от Telegram API данных
 * и поддерживает единую идентификацию пользователя в режиме AirDrop
 */

import { v4 as uuidv4 } from 'uuid';

export interface GuestIdOptions {
  storageKey?: string;
  generateIfMissing?: boolean;
}

/**
 * Ключ для хранения guest_id в localStorage
 */
const DEFAULT_STORAGE_KEY = 'unifarm_guest_id';

/**
 * Получает существующий guest_id из localStorage или создает новый
 * @param options Параметры для работы с guest_id
 * @returns Существующий или новый guest_id
 */
export const getGuestId = (options: GuestIdOptions = {}): string => {
  const storageKey = options.storageKey || DEFAULT_STORAGE_KEY;
  const generateIfMissing = options.generateIfMissing !== false; // По умолчанию true
  
  try {
    // Попытка получить существующий guest_id из localStorage
    const existingGuestId = localStorage.getItem(storageKey);
    
    if (existingGuestId) {
      console.log('[GuestIdService] Найден существующий guest_id:', existingGuestId);
      return existingGuestId;
    }
    
    // Если guest_id не найден и нужно создать новый
    if (generateIfMissing) {
      // Генерируем новый UUID v4
      const newGuestId = uuidv4();
      
      // Сохраняем в localStorage
      localStorage.setItem(storageKey, newGuestId);
      
      console.log('[GuestIdService] Создан новый guest_id:', newGuestId);
      return newGuestId;
    }
    
    console.log('[GuestIdService] guest_id не найден и автоматическое создание отключено');
    return '';
  } catch (error) {
    console.error('[GuestIdService] Ошибка при работе с guest_id:', error);
    
    // В случае ошибки генерируем временный guest_id, но не сохраняем его
    if (generateIfMissing) {
      const tempGuestId = uuidv4();
      console.warn('[GuestIdService] Создан временный guest_id (не сохранен):', tempGuestId);
      return tempGuestId;
    }
    
    return '';
  }
};

/**
 * Сохраняет новый guest_id в localStorage
 * @param guestId Новый guest_id для сохранения
 * @param options Параметры для работы с guest_id
 * @returns true если сохранение успешно, иначе false
 */
export const saveGuestId = (guestId: string, options: GuestIdOptions = {}): boolean => {
  const storageKey = options.storageKey || DEFAULT_STORAGE_KEY;
  
  if (!guestId) {
    console.error('[GuestIdService] Попытка сохранить пустой guest_id');
    return false;
  }
  
  try {
    localStorage.setItem(storageKey, guestId);
    console.log('[GuestIdService] guest_id успешно сохранен:', guestId);
    return true;
  } catch (error) {
    console.error('[GuestIdService] Ошибка при сохранении guest_id:', error);
    return false;
  }
};

/**
 * Проверяет, существует ли уже guest_id в localStorage
 * @param options Параметры для работы с guest_id
 * @returns true если guest_id существует, иначе false
 */
export const hasGuestId = (options: GuestIdOptions = {}): boolean => {
  const storageKey = options.storageKey || DEFAULT_STORAGE_KEY;
  
  try {
    const existingGuestId = localStorage.getItem(storageKey);
    return !!existingGuestId;
  } catch (error) {
    console.error('[GuestIdService] Ошибка при проверке наличия guest_id:', error);
    return false;
  }
};

/**
 * Удаляет guest_id из localStorage
 * @param options Параметры для работы с guest_id
 * @returns true если удаление успешно, иначе false
 */
export const removeGuestId = (options: GuestIdOptions = {}): boolean => {
  const storageKey = options.storageKey || DEFAULT_STORAGE_KEY;
  
  try {
    localStorage.removeItem(storageKey);
    console.log('[GuestIdService] guest_id успешно удален');
    return true;
  } catch (error) {
    console.error('[GuestIdService] Ошибка при удалении guest_id:', error);
    return false;
  }
};

// Экспортируем объект сервиса для удобства использования
export const GuestIdService = {
  get: getGuestId,
  save: saveGuestId,
  has: hasGuestId,
  remove: removeGuestId
};

export default GuestIdService;