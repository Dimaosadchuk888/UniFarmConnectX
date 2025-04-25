/**
 * Компонент для проверки запуска приложения в Telegram Mini App
 * Если приложение запущено не в Telegram, перенаправляет на страницу telegram-redirect
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

interface TelegramWebAppCheckProps {
  children: React.ReactNode;
}

export default function TelegramWebAppCheck({ children }: TelegramWebAppCheckProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isTelegramApp, setIsTelegramApp] = useState(false);
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    // Пропускаем проверку на специальных маршрутах
    const skipRoutes = [
      '/telegram-redirect',
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
      // Получаем параметры из URL
      const urlParams = new URLSearchParams(window.location.search);
      const noRedirect = urlParams.get('no_redirect') === 'true';
      const debugMode = urlParams.get('debug') === 'true';
      const redirectDisabled = localStorage.getItem('disable_redirect') === 'true';
      
      // В режиме разработки не делаем перенаправление
      if (process.env.NODE_ENV === 'development' && !debugMode) {
        console.log('[TelegramWebAppCheck] Пропуск проверки в режиме разработки');
        setIsTelegramApp(true);
        setIsChecking(false);
        return;
      }
      
      // Если пользователь явно отключил перенаправление
      if (noRedirect || redirectDisabled) {
        console.log('[TelegramWebAppCheck] Перенаправление отключено параметром или localStorage');
        setIsTelegramApp(true);
        setIsChecking(false);
        return;
      }
      
      // Проверяем наличие объекта Telegram.WebApp
      const isTelegramAvailable = typeof window !== 'undefined' && !!window.Telegram;
      const isWebAppAvailable = isTelegramAvailable && !!window.Telegram?.WebApp;
      
      console.log('[TelegramWebAppCheck] Проверка запуска в Telegram Mini App:', {
        isTelegramAvailable,
        isWebAppAvailable,
        currentLocation: location,
        userAgent: navigator.userAgent
      });
      
      // Если мы не в Telegram WebApp, выполняем редирект
      if (!isWebAppAvailable) {
        console.log('[TelegramWebAppCheck] Требуется перенаправление на Telegram Mini App');
        
        // Поскольку мы находимся в компоненте React, используем wouter для навигации
        setLocation('/telegram-redirect');
        return;
      }
      
      // Если все проверки пройдены, разрешаем продолжить
      setIsTelegramApp(true);
      setIsChecking(false);
    };
    
    // Короткая задержка для загрузки всех ресурсов
    const timeout = setTimeout(() => {
      checkTelegramWebApp();
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [location, setLocation]);
  
  // Пока идет проверка, показываем индикатор загрузки
  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  // Если это Telegram App или страница из списка исключений, показываем содержимое
  return <>{children}</>;
}