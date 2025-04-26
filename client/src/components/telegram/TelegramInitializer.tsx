import { useEffect } from 'react';
import { isTelegramWebApp, initTelegramWebApp, diagnosticTelegramWebApp, logAppLaunch } from '@/services/telegramService';

/**
 * Компонент для инициализации Telegram WebApp API
 * Этот компонент должен быть добавлен в корень приложения
 * для обеспечения работы во всех маршрутах
 */
const TelegramInitializer = () => {
  useEffect(() => {
    console.log('[TelegramInitializer] 🔄 Инициализация...');
    
    try {
      // Проверяем доступность официального Telegram WebApp API
      const isTelegram = isTelegramWebApp();
      
      if (isTelegram) {
        console.log('[TelegramInitializer] ✅ Официальный Telegram WebApp API обнаружен');
        
        // Инициализируем Telegram WebApp API
        const initResult = initTelegramWebApp();
        console.log(`[TelegramInitializer] Инициализация Telegram WebApp API: ${initResult ? 'успешно' : 'не удалась'}`);
        
        // Выводим диагностическую информацию
        const diagnosticInfo = diagnosticTelegramWebApp();
        console.log('[TelegramInitializer] Диагностическая информация:', diagnosticInfo);
        
        // Логируем запуск приложения
        logAppLaunch().then(success => {
          console.log(`[TelegramInitializer] Логирование запуска: ${success ? 'успешно' : 'не удалось'}`);
        }).catch(error => {
          console.error('[TelegramInitializer] Ошибка при логировании запуска:', error);
        });
      } else {
        console.log('[TelegramInitializer] ℹ️ Telegram WebApp API не обнаружен, работаем в гостевом режиме');
        
        // Всё равно логируем запуск приложения для аналитики
        logAppLaunch().catch(error => {
          console.error('[TelegramInitializer] Ошибка при логировании запуска:', error);
        });
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