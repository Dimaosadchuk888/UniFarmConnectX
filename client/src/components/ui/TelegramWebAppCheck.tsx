/**
 * Компонент для проверки запуска приложения в Telegram Mini App
 * Логика автоматического перенаправления отключена
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

interface TelegramWebAppCheckProps {
  children: React.ReactNode;
}

export default function TelegramWebAppCheck({ children }: TelegramWebAppCheckProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isTelegramApp, setIsTelegramApp] = useState(false);
  const [location] = useLocation();
  
  useEffect(() => {
    // Пропускаем проверку на специальных маршрутах
    const skipRoutes = [
      '/telegram-test',
      '/debug',
      '/webhook-setup',
      '/admin',
      '/audit',
      '/telegram-validation',
      '/telegram-setup'
    ];
    
    if (skipRoutes.some(route => location.startsWith(route))) {
      setIsChecking(false);
      return;
    }
    
    // Проверка запуска в Telegram
    const checkTelegramWebApp = () => {
      // Параметры URL и флаги для отладки
      const urlParams = new URLSearchParams(window.location.search);
      const debugMode = urlParams.get('debug') === 'true';
      
      // В режиме разработки всегда пропускаем проверку
      if (process.env.NODE_ENV === 'development' && !debugMode) {
        console.log('[TelegramWebAppCheck] Пропуск проверки в режиме разработки');
        setIsTelegramApp(true);
        setIsChecking(false);
        return;
      }
      
      // Проверяем, пришел ли запрос со слэшем в конце (возможная проблема BotFather)
      const hasTrailingSlash = window.location.pathname.endsWith('/') && window.location.pathname !== '/';
      if (hasTrailingSlash) {
        console.log('[TelegramWebAppCheck] ⚠️ Обнаружен завершающий слэш в URL - это может вызвать проблемы с Telegram WebApp:', window.location.pathname);
      }
      
      // Этап 10.3: Больше не проверяем наличие Telegram.WebApp
      const isTelegramAvailable = false; // В Этапе 10.3 - независимость от window.Telegram
      const isWebAppAvailable = false; // В Этапе 10.3 - независимость от window.Telegram.WebApp
      
      console.log('[TelegramWebAppCheck] Этап 10.3: Независимая работа от Telegram Mini App:', {
        isTelegramAvailable, // Всегда false (для совместимости)
        isWebAppAvailable, // Всегда false (для совместимости)
        hasTrailingSlash,
        currentLocation: location,
        userAgent: navigator.userAgent
      });
      
      // Этап 10.3: Всегда разрешаем продолжить, независимо от Telegram WebApp
      // Приложение работает в режиме AirDrop без зависимости от Telegram
      setIsTelegramApp(true);
      setIsChecking(false);
    };
    
    // Короткая задержка для загрузки всех ресурсов
    const timeout = setTimeout(() => {
      checkTelegramWebApp();
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [location]);
  
  // Пока идет проверка, показываем индикатор загрузки
  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  // Всегда показываем содержимое
  return <>{children}</>;
}