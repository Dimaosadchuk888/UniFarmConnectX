import { useEffect } from 'react';
import { isTelegramWebApp, initTelegramWebApp, diagnosticTelegramWebApp, logAppLaunch } from '@/services/telegramService';
import sessionRestoreService from '@/services/sessionRestoreService';

/**
 * Компонент для инициализации Telegram WebApp API
 * Этот компонент должен быть добавлен в корень приложения
 * для обеспечения работы во всех маршрутах
 * 
 * Выполняет следующие задачи:
 * 1. Проверяет доступность Telegram WebApp API
 * 2. Вызывает WebApp.ready() для инициализации Telegram WebApp
 * 3. Отмечает готовность Telegram WebApp для других компонентов
 * 4. Логирует запуск приложения для аналитики
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
        
        // Вызываем WebApp.ready() еще раз для гарантии инициализации
        try {
          if (window.Telegram?.WebApp?.ready) {
            console.log('[TelegramInitializer] Вызываем WebApp.ready() для подтверждения инициализации');
            window.Telegram.WebApp.ready();
            
            // Отмечаем Telegram WebApp как готовый для других компонентов
            sessionRestoreService.markTelegramWebAppAsReady();
          }
        } catch (readyError) {
          console.error('[TelegramInitializer] Ошибка при вызове WebApp.ready():', readyError);
        }
        
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
        
        // Отмечаем отсутствие необходимости ожидания инициализации
        sessionRestoreService.markTelegramWebAppAsReady();
        
        // Всё равно логируем запуск приложения для аналитики
        logAppLaunch().catch(error => {
          console.error('[TelegramInitializer] Ошибка при логировании запуска:', error);
        });
      }
    } catch (error) {
      console.error('[TelegramInitializer] ❌ Общая ошибка инициализации:', error);
      
      // В случае ошибки всё равно отмечаем готовность, чтобы не блокировать приложение
      sessionRestoreService.markTelegramWebAppAsReady();
    }
    
    return () => {
      console.log('[TelegramInitializer] 🔄 Компонент демонтирован');
    };
  }, []);
  
  // Компонент не рендерит видимый контент
  return null;
};

export default TelegramInitializer;