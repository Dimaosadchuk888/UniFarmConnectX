/**
 * Конфигурация API-клиента для UniFarm
 * 
 * Этот файл содержит настройки для взаимодействия с API:
 * - Базовый URL API в зависимости от окружения
 * - Тайм-ауты и другие параметры запросов
 */

// Определяем базовый URL API в зависимости от окружения
let API_BASE_URL = '';

// Используем локальный сервер для разработки и тестирования
if (typeof window !== 'undefined') {
  const protocol = window.location.protocol;
  const host = window.location.host;
  API_BASE_URL = `${protocol}//${host}`;
} else {
  // Fallback для серверной среды
  API_BASE_URL = '';
}

/**
 * Конфигурация API-клиента
 */
const apiConfig = {
  /**
   * Базовый URL API
   */
  baseUrl: API_BASE_URL,
  
  /**
   * Формирует полный URL для API-запроса
   * @param endpoint Относительный путь эндпоинта API
   * @returns Полный URL для запроса
   */
  getFullUrl: (endpoint: string): string => {
    // Проверяем, начинается ли endpoint с /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Если baseUrl пустой (режим разработки), возвращаем относительный URL
    if (!apiConfig.baseUrl) {
      return normalizedEndpoint;
    }
    
    // Формируем и возвращаем полный URL
    return `${apiConfig.baseUrl}${normalizedEndpoint}`;
  },
  
  /**
   * Тайм-аут запроса в миллисекундах
   */
  timeout: 15000,
  
  /**
   * Количество попыток повтора запроса при ошибке
   */
  retries: 2
};

export default apiConfig;