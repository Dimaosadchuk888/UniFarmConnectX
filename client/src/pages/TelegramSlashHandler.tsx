import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Компонент для обработки URL с завершающим слэшем в Telegram Mini App
 * Когда BotFather автоматически добавляет слэш в конце URL, этот компонент
 * корректно перенаправляет пользователя на основной URL и инициирует Telegram WebApp
 */
export default function TelegramSlashHandler() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Функция для инициализации Telegram WebApp при наличии слэша в конце URL
    const initTelegramFromSlashUrl = () => {
      console.log('[TelegramSlashHandler] Инициализация Telegram WebApp для URL с завершающим слэшем');
      
      try {
        // Проверяем наличие Telegram WebApp
        if (window.Telegram?.WebApp) {
          console.log('[TelegramSlashHandler] Telegram WebApp обнаружен, выполняем ready()...');
          
          // Сохраняем initData из Telegram WebApp (если доступно)
          if (window.Telegram.WebApp.initData) {
            try {
              localStorage.setItem('telegramInitData', window.Telegram.WebApp.initData);
              console.log('[TelegramSlashHandler] initData сохранен в localStorage');
            } catch (e) {
              console.error('[TelegramSlashHandler] Ошибка при сохранении initData:', e);
            }
          }
          
          // Вызываем ready() для сигнализации о готовности приложения
          window.Telegram.WebApp.ready();
          console.log('[TelegramSlashHandler] Telegram.WebApp.ready() вызван успешно');
          
          // Расширяем окно Telegram WebApp
          try {
            window.Telegram.WebApp.expand();
            console.log('[TelegramSlashHandler] Telegram.WebApp.expand() вызван успешно');
          } catch (e) {
            console.error('[TelegramSlashHandler] Ошибка при вызове expand():', e);
          }
        } else {
          console.warn('[TelegramSlashHandler] Telegram WebApp не обнаружен');
        }
      } catch (error) {
        console.error('[TelegramSlashHandler] Ошибка при инициализации Telegram WebApp:', error);
      }
      
      // Перенаправляем на корневой URL (без слэша в конце)
      console.log('[TelegramSlashHandler] Перенаправление на корневой URL...');
      setLocation('/');
    };

    // Выполняем инициализацию с небольшой задержкой
    setTimeout(initTelegramFromSlashUrl, 100);
  }, [setLocation]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <p className="text-xl mb-4">Инициализация приложения...</p>
      <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  );
}