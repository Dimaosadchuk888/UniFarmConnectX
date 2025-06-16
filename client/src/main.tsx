import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ReplitErrorBoundaryContext } from "./contexts/ReplitErrorBoundaryContext";
import frontendLogger from "./utils/frontendLogger";

// Улучшенная диагностика Telegram WebApp с проверкой готовности
frontendLogger.debug('=== TELEGRAM WEBAPP DEBUG START ===');
frontendLogger.debug('Current URL:', window.location.href);
frontendLogger.debug('User Agent:', navigator.userAgent);
frontendLogger.debug('Referrer:', document.referrer);
frontendLogger.debug('Is iframe:', window !== window.parent);

// Функция для проверки Telegram WebApp с задержкой
function checkTelegramWebApp(attempt = 1, maxAttempts = 10) {
  frontendLogger.debug(`[Attempt ${attempt}/${maxAttempts}] Checking Telegram WebApp...`);
  
  if (typeof window.Telegram !== 'undefined' && window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    frontendLogger.info('✅ Telegram WebApp найден!');
    frontendLogger.debug('Platform:', tg.platform);
    frontendLogger.debug('Version:', tg.version);
    frontendLogger.debug('initData присутствует:', !!tg.initData);
    frontendLogger.debug('initData длина:', tg.initData?.length || 0);
    frontendLogger.debug('Is expanded:', tg.isExpanded);
    frontendLogger.debug('Viewport height:', tg.viewportHeight);
    
    // Детальная информация о initData
    if (tg.initData && tg.initData.length > 0) {
      frontendLogger.info('✅ initData получен:', tg.initData.substring(0, 100) + '...');
      frontendLogger.info('initDataUnsafe:', JSON.stringify(tg.initDataUnsafe, null, 2));
      
      if (tg.initDataUnsafe?.user) {
        frontendLogger.info('✅ Пользователь найден:');
        frontendLogger.info('- User ID:', tg.initDataUnsafe.user.id);
        frontendLogger.info('- Username:', tg.initDataUnsafe.user.username);
        frontendLogger.info('- First name:', tg.initDataUnsafe.user.first_name);
        frontendLogger.info('- Language:', tg.initDataUnsafe.user.language_code);
      } else {
        frontendLogger.info('❌ Нет данных пользователя в initDataUnsafe');
      }
      
      // Проверяем start_param для реферальных ссылок
      if (tg.initDataUnsafe?.start_param) {
        frontendLogger.info('✅ Start param найден:', tg.initDataUnsafe.start_param);
      }
    } else {
      frontendLogger.info('❌ initData пустой - возможные причины:');
      frontendLogger.info('1. Приложение открыто не из Telegram (прямо в браузере)');
      frontendLogger.info('2. Неправильно настроен Web App URL в BotFather');
      frontendLogger.info('3. Приложение не прошло валидацию Telegram');
      
      // Дополнительные проверки
      frontendLogger.info('Window location:', {
        protocol: window.location.protocol,
        host: window.location.host,
        pathname: window.location.pathname,
        search: window.location.search
      });
      
      // Проверяем, есть ли признаки Telegram среды
      const isTelegramEnv = !!(
        (window as any).TelegramWebviewProxy ||
        navigator.userAgent.includes('Telegram') ||
        window.parent !== window
      );
      frontendLogger.info('Признаки Telegram среды:', isTelegramEnv);
    }
    
    // Вызываем ready() и expand()
    try {
      tg.ready();
      tg.expand();
      frontendLogger.info('✅ Telegram WebApp инициализирован (ready + expand)');
    } catch (error) {
      frontendLogger.info('❌ Ошибка инициализации Telegram WebApp:', error);
    }
    
    return true;
  } else {
    frontendLogger.info(`❌ Telegram WebApp недоступен (попытка ${attempt})`);
    frontendLogger.info('window.Telegram:', typeof window.Telegram);
    frontendLogger.info('window.Telegram?.WebApp:', typeof window.Telegram?.WebApp);
    
    if (attempt < maxAttempts) {
      // Повторяем проверку через 500мс
      setTimeout(() => checkTelegramWebApp(attempt + 1, maxAttempts), 500);
      return false;
    } else {
      frontendLogger.info('🚨 КРИТИЧНО: Telegram WebApp так и не был найден');
      frontendLogger.info('Возможные причины:');
      frontendLogger.info('1. Скрипт telegram-web-app.js не загрузился');
      frontendLogger.info('2. Приложение открыто вне Telegram');
      frontendLogger.info('3. Блокировка скриптов в браузере');
      return false;
    }
  }
}

// Запускаем проверку
checkTelegramWebApp();

frontendLogger.info('=== TELEGRAM WEBAPP DEBUG END ===');

// Простая инициализация без сложной логики DOM// Create a minimal ErrorBoundaryContext implementation for @replit/vite-plugin-runtime-error-modal
const createErrorBoundaryContext = () => {
  const context = React.createContext({
    error: null,
    setError: () => {},
    clearError: () => {},
    hasError: false,
    reportError: () => {}
  });
  return context;
};

// Make ErrorBoundaryContext globally available
if (typeof window !== 'undefined') {
  (window as any).React = React;
  (window as any).ErrorBoundaryContext = createErrorBoundaryContext();
}

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);} else {}