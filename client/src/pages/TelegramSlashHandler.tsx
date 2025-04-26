import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

/**
 * Компонент для обработки URL с завершающим слэшем в Telegram Mini App
 * Когда BotFather автоматически добавляет слэш в конце URL, этот компонент
 * корректно перенаправляет пользователя на основной URL и инициирует Telegram WebApp
 */
export default function TelegramSlashHandler() {
  const [, setLocation] = useLocation();
  const [details, setDetails] = useState<string | null>(null);
  const [telegramAvailable, setTelegramAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    // Анализируем URL с отладочной информацией
    const currentPath = window.location.pathname;
    const currentUrl = window.location.href;
    const hasRefCodeParam = window.location.search.includes('ref_code') || window.location.search.includes('startapp');
    const userAgent = navigator.userAgent;
    
    // Устанавливаем отладочную информацию
    setDetails(`URL: ${currentUrl}, refCodeParam: ${hasRefCodeParam ? 'есть' : 'нет'}, user-agent: ${userAgent.substr(0, 50)}...`);

    // Функция для инициализации Telegram WebApp при наличии слэша в конце URL
    const initTelegramFromSlashUrl = () => {
      console.log('[TelegramSlashHandler] 🔄 Инициализация Telegram WebApp', {
        url: currentUrl,
        path: currentPath,
        hasRefCodeParam,
        userAgent
      });
      
      try {
        // Проверяем наличие Telegram WebApp
        const isTelegramAvailable = typeof window !== 'undefined' && !!window.Telegram;
        const isWebAppAvailable = isTelegramAvailable && !!window.Telegram?.WebApp;
        
        setTelegramAvailable(isWebAppAvailable);
        
        if (isWebAppAvailable) {
          console.log('[TelegramSlashHandler] ✅ Telegram WebApp обнаружен, выполняем инициализацию...');
          
          // Определяем временную переменную для работы с Telegram API, чтобы TypeScript не ругался
          const telegram = window.Telegram as any;
          const webApp = telegram?.WebApp;
          
          if (telegram && webApp) {
            // Получаем всю информацию о WebApp
            const webAppInfo = {
              initData: webApp.initData || '',
              initDataUnsafe: webApp.initDataUnsafe ? 'доступно' : 'недоступно',
              version: webApp.version || 'неизвестно',
              platform: webApp.platform || 'неизвестно',
              colorScheme: webApp.colorScheme || 'неизвестно'
            };
            
            console.log('[TelegramSlashHandler] 📊 WebApp info:', webAppInfo);
            
            // Сохраняем initData из Telegram WebApp (если доступно)
            if (webApp.initData) {
              try {
                localStorage.setItem('telegramInitData', webApp.initData);
                console.log('[TelegramSlashHandler] 💾 initData сохранен в localStorage');
              } catch (e) {
                console.error('[TelegramSlashHandler] ⚠️ Ошибка при сохранении initData:', e);
              }
            }
            
            // Сигнализируем Telegram о готовности приложения
            webApp.ready();
            console.log('[TelegramSlashHandler] ✅ Метод ready() вызван успешно');
            
            // Расширяем окно до максимальной высоты
            try {
              webApp.expand();
              console.log('[TelegramSlashHandler] ✅ Метод expand() вызван успешно');
            } catch (e) {
              console.error('[TelegramSlashHandler] ⚠️ Ошибка при вызове expand():', e);
            }
          }
          
          // Проверяем наличие параметров реферальной ссылки в URL
          const urlParams = new URLSearchParams(window.location.search);
          
          // Сначала проверяем новый формат с параметром ref_code
          const refCodeParam = urlParams.get('ref_code');
          if (refCodeParam) {
            console.log('[TelegramSlashHandler] 🔍 Обнаружен параметр ref_code:', refCodeParam);
            // Сохраняем параметр в localStorage для последующего использования
            localStorage.setItem('referralCode', refCodeParam);
          }
          
          // Для обратной совместимости также проверяем старый формат startapp
          const startParam = urlParams.get('startapp');
          if (startParam) {
            console.log('[TelegramSlashHandler] 🔍 Обнаружен устаревший параметр startapp:', startParam);
            // Сохраняем параметр startapp в localStorage для последующего использования
            localStorage.setItem('telegramStartParam', startParam);
          }
        } else {
          console.warn('[TelegramSlashHandler] ⚠️ Telegram WebApp не обнаружен');
        }
      } catch (error) {
        console.error('[TelegramSlashHandler] ❌ Ошибка при инициализации Telegram WebApp:', error);
      }
      
      // Ждем небольшую задержку, чтобы все методы initData были выполнены
      setTimeout(() => {
        // Перенаправляем на корневой URL с сохранением параметров запроса
        console.log('[TelegramSlashHandler] 🔄 Перенаправление на корневой URL...');
        
        // Сохраняем параметры запроса
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.toString() ? `/?${urlParams.toString()}` : '/';
        
        setLocation(redirectUrl);
      }, 500);
    };

    // Выполняем инициализацию с небольшой задержкой для загрузки Telegram WebApp API
    const initTimeout = setTimeout(initTelegramFromSlashUrl, 100);
    
    return () => clearTimeout(initTimeout);
  }, [setLocation]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-2">Инициализация Telegram Mini App</h1>
      <p className="text-lg mb-6 text-center">Приложение запускается, пожалуйста, подождите...</p>
      
      <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mb-6"></div>
      
      {telegramAvailable !== null && (
        <div className={`text-sm p-3 mb-2 rounded-md text-center ${telegramAvailable ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
          {telegramAvailable 
            ? "✅ Telegram WebApp API обнаружен" 
            : "⚠️ Telegram WebApp API не обнаружен"}
        </div>
      )}
      
      {details && (
        <div className="text-xs bg-gray-100 p-2 rounded max-w-full overflow-auto mt-4 text-gray-700">
          <p className="font-mono break-all">{details}</p>
        </div>
      )}
    </div>
  );
}