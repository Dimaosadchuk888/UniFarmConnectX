/**
 * Извлекает userId из JWT токена
 */

export function getUserIdFromJWT(): string | null {
  try {
    const token = localStorage.getItem('unifarm_jwt_token');
    if (!token) {
      console.log('[getUserIdFromJWT] Токен не найден');
      return null;
    }

    // Парсим payload JWT токена
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.userId || payload.user_id;
    
    if (userId) {
      console.log('[getUserIdFromJWT] Извлечен userId:', userId);
      return String(userId);
    }
    
    console.log('[getUserIdFromJWT] userId не найден в токене');
    return null;
  } catch (error) {
    console.error('[getUserIdFromJWT] Ошибка парсинга JWT:', error);
    return null;
  }
}