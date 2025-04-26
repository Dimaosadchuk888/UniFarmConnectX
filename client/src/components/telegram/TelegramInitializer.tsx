import { useEffect } from 'react';

/**
 * Компонент для инициализации Telegram WebApp API
 * Этот компонент должен быть добавлен в корень приложения
 * для обеспечения работы во всех маршрутах
 */
const TelegramInitializer = () => {
  useEffect(() => {
    console.log('[TelegramInitializer] 🔄 Инициализация...');
    
    try {
      // Проверяем наличие Telegram WebApp API
      if (
        typeof window !== 'undefined' &&
        window.Telegram &&
        window.Telegram.WebApp
      ) {
        console.log('[TelegramInitializer] ✅ Telegram WebApp API обнаружен');
        
        // Вызываем необходимые методы для инициализации
        try {
          // 1. Сигнализируем Telegram о готовности приложения
          window.Telegram.WebApp.ready();
          console.log('[TelegramInitializer] ✅ Метод ready() вызван успешно');
          
          // 2. Расширяем окно приложения на весь экран
          window.Telegram.WebApp.expand();
          console.log('[TelegramInitializer] ✅ Метод expand() вызван успешно');
          
          // 3. Выводим информацию о версии Telegram WebApp
          if (window.Telegram.WebApp.version) {
            console.log(`[TelegramInitializer] ℹ️ Версия Telegram WebApp: ${window.Telegram.WebApp.version}`);
          }
          
          // 4. Выводим информацию о платформе
          if (window.Telegram.WebApp.platform) {
            console.log(`[TelegramInitializer] ℹ️ Платформа: ${window.Telegram.WebApp.platform}`);
          }
        } catch (error) {
          console.error('[TelegramInitializer] ❌ Ошибка при вызове методов Telegram WebApp:', error);
        }
      } else {
        console.log('[TelegramInitializer] ℹ️ Telegram WebApp API не обнаружен, работаем в стандартном режиме');
      }
    } catch (error) {
      console.error('[TelegramInitializer] ❌ Общая ошибка инициализации:', error);
    }
    
    return () => {
      console.log('[TelegramInitializer] 🔄 Компонент демонтирован');
    };
  }, []);
  
  // Компонент не рендерит видимый контент
  return null;
};

export default TelegramInitializer;