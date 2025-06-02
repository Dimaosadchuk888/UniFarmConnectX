/**
 * Конфигурация API-клиента для UniFarm
 */

export const apiConfig = {
  /**
   * Базовый URL API
   */
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v2',
  
  /**
   * Формирует полный URL для API-запроса
   * @param endpoint Относительный путь эндпоинта API
   * @returns Полный URL для запроса
   */
  getFullUrl: (endpoint: string): string => {
    const baseURL = apiConfig.baseURL;
    
    // Если endpoint уже содержит базовый путь, возвращаем как есть
    if (endpoint.startsWith('/api/v2') || endpoint.startsWith('api/v2')) {
      return endpoint;
    }
    
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${baseURL}/${cleanEndpoint}`;
  },

  /**
   * Тайм-аут запроса в миллисекундах
   */
  timeout: 30000,

  /**
   * Количество попыток повтора запроса при ошибке
   */
  maxRetries: 3,

  /**
   * Базовые заголовки для всех запросов
   */
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },

  /**
   * Конфигурация для различных эндпоинтов
   */
  endpoints: {
    auth: 'auth',
    users: 'users',
    wallet: 'wallet',
    farming: 'farming',
    missions: 'missions',
    referral: 'referral',
    boost: 'boost',
    dailyBonus: 'daily-bonus',
    telegram: 'telegram',
    admin: 'admin'
  }
};

export default apiConfig;