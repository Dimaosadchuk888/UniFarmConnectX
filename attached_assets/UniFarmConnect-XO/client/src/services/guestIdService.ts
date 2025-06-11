/**
 * Сервис для работы с гостевыми идентификаторами
 */

/**
 * Генерирует уникальный гостевой ID
 */
export function generateGuestId(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8);
  return `guest_${timestamp}_${random}`;
}

/**
 * Сохраняет гостевой ID в localStorage
 */
export function saveGuestId(guestId: string): void {
  try {
    localStorage.setItem('unifarm_guest_id', guestId);
  } catch (error) {
    console.warn('Не удалось сохранить guest ID в localStorage:', error);
  }
}

/**
 * Получает гостевой ID из localStorage
 */
export function getStoredGuestId(): string | null {
  try {
    return localStorage.getItem('unifarm_guest_id');
  } catch (error) {
    console.warn('Не удалось получить guest ID из localStorage:', error);
    return null;
  }
}

/**
 * Получает или создает гостевой ID
 */
export function getOrCreateGuestId(): string {
  let guestId = getStoredGuestId();
  
  if (!guestId) {
    guestId = generateGuestId();
    saveGuestId(guestId);
  }
  
  return guestId;
}

/**
 * Удаляет гостевой ID из localStorage
 */
export function clearGuestId(): void {
  try {
    localStorage.removeItem('unifarm_guest_id');
  } catch (error) {
    console.warn('Не удалось удалить guest ID из localStorage:', error);
  }
}

/**
 * Проверяет, является ли ID гостевым
 */
export function isGuestId(id: string): boolean {
  return id.startsWith('guest_');
}

// Экспорт функции getGuestId для обратной совместимости
export const getGuestId = getOrCreateGuestId;

// Экспорт по умолчанию для совместимости
const guestIdService = {
  generateGuestId,
  saveGuestId,
  getStoredGuestId,
  getOrCreateGuestId,
  getGuestId,
  clearGuestId,
  isGuestId
};

export default guestIdService;