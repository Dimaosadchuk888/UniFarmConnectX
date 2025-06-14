import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ReplitErrorBoundaryContext } from "./contexts/ReplitErrorBoundaryContext";

// Улучшенная диагностика Telegram WebApp с проверкой готовности
console.log('=== TELEGRAM WEBAPP DEBUG START ===');
console.log('Current URL:', window.location.href);
console.log('User Agent:', navigator.userAgent);
console.log('Referrer:', document.referrer);
console.log('Is iframe:', window !== window.parent);

// Функция для проверки Telegram WebApp с задержкой
function checkTelegramWebApp(attempt = 1, maxAttempts = 10) {
  console.log(`[Attempt ${attempt}/${maxAttempts}] Checking Telegram WebApp...`);
  
  if (typeof window.Telegram !== 'undefined' && window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    console.log('✅ Telegram WebApp найден!');
    console.log('Platform:', tg.platform);
    console.log('Version:', tg.version);
    console.log('initData присутствует:', !!tg.initData);
    console.log('initData длина:', tg.initData?.length || 0);
    console.log('Is expanded:', tg.isExpanded);
    console.log('Viewport height:', tg.viewportHeight);
    
    // Детальная информация о initData
    if (tg.initData && tg.initData.length > 0) {
      console.log('✅ initData получен:', tg.initData.substring(0, 100) + '...');
      console.log('initDataUnsafe:', JSON.stringify(tg.initDataUnsafe, null, 2));
      
      if (tg.initDataUnsafe?.user) {
        console.log('✅ Пользователь найден:');
        console.log('- User ID:', tg.initDataUnsafe.user.id);
        console.log('- Username:', tg.initDataUnsafe.user.username);
        console.log('- First name:', tg.initDataUnsafe.user.first_name);
        console.log('- Language:', tg.initDataUnsafe.user.language_code);
      } else {
        console.log('❌ Нет данных пользователя в initDataUnsafe');
      }
      
      // Проверяем start_param для реферальных ссылок
      if (tg.initDataUnsafe?.start_param) {
        console.log('✅ Start param найден:', tg.initDataUnsafe.start_param);
      }
    } else {
      console.log('❌ initData пустой - возможные причины:');
      console.log('1. Приложение открыто не из Telegram (прямо в браузере)');
      console.log('2. Неправильно настроен Web App URL в BotFather');
      console.log('3. Приложение не прошло валидацию Telegram');
      
      // Дополнительные проверки
      console.log('Window location:', {
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
      console.log('Признаки Telegram среды:', isTelegramEnv);
    }
    
    // Вызываем ready() и expand()
    try {
      tg.ready();
      tg.expand();
      console.log('✅ Telegram WebApp инициализирован (ready + expand)');
    } catch (error) {
      console.log('❌ Ошибка инициализации Telegram WebApp:', error);
    }
    
    return true;
  } else {
    console.log(`❌ Telegram WebApp недоступен (попытка ${attempt})`);
    console.log('window.Telegram:', typeof window.Telegram);
    console.log('window.Telegram?.WebApp:', typeof window.Telegram?.WebApp);
    
    if (attempt < maxAttempts) {
      // Повторяем проверку через 500мс
      setTimeout(() => checkTelegramWebApp(attempt + 1, maxAttempts), 500);
      return false;
    } else {
      console.log('🚨 КРИТИЧНО: Telegram WebApp так и не был найден');
      console.log('Возможные причины:');
      console.log('1. Скрипт telegram-web-app.js не загрузился');
      console.log('2. Приложение открыто вне Telegram');
      console.log('3. Блокировка скриптов в браузере');
      return false;
    }
  }
}

// Запускаем проверку
checkTelegramWebApp();

console.log('=== TELEGRAM WEBAPP DEBUG END ===');

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