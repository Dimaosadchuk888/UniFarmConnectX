import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Импортируем полифиллы перед взаимодействием с API
import installAllPolyfills from './lib/polyfills';

// Импортируем утилиту для подавления ненужных логов
import { setupLogSuppression } from './utils/suppressLogs';

// Устанавливаем полифиллы в самом начале
installAllPolyfills();

// Устанавливаем фильтрацию логов
setupLogSuppression();

// Импортируем функции из telegramService
import { 
  initTelegramWebApp, 
  isTelegramWebApp 
} from './services/telegramService';

// Обеспечиваем глобальный процесс для приложения
window.process = { 
  env: { 
    NODE_ENV: 'production',
    VITE_APP_ENV: 'production'
  } 
} as any;

// Создаём body если его нет
if (typeof document !== 'undefined' && !document.body) {
  const body = document.createElement('body');
  document.documentElement.appendChild(body);
  console.log('[DOM] Создали body элемент');
}

// Проверяем, запущено ли приложение в Telegram
const isTelegramEnvironment = isTelegramWebApp();

console.log('[TG INIT] Проверка среды выполнения:', {
  isTelegramEnvironment,
  isDevelopment: process.env.NODE_ENV === 'development',
  hasLocalStorage: typeof localStorage !== 'undefined',
  hasSessionStorage: typeof sessionStorage !== 'undefined',
  savedGuestId: localStorage.getItem('unifarm_guest_id') || 'отсутствует',
  timestamp: new Date().toISOString()
});

// Инициализируем Telegram WebApp
initTelegramWebApp();

// Для гарантии инициализации также добавим слушатель DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  console.log('[main] DOMContentLoaded event, повторная проверка инициализации Telegram WebApp');
  initTelegramWebApp();
});

console.log('[RENDER] Запуск React приложения UniFarm...');

// Для отладки записываем информацию о среде
if (isTelegramEnvironment) {
  console.log('[TG CHECK] Приложение запущено из Telegram');
} else {
  console.log('[TG CHECK] Приложение запущено не из Telegram');
}

// Функция для безопасного рендеринга React приложения
function renderApp() {
  try {
    // Проверяем готовность DOM
    if (!document.body) {
      console.log('[RENDER] ⏳ DOM ещё не готов, ждём...');
      setTimeout(renderApp, 50);
      return;
    }

    const rootElement = document.getElementById("root");
    if (rootElement) {
      const root = createRoot(rootElement);
      root.render(<App />);
      console.log('[RENDER] ✅ UniFarm React приложение успешно запущено');
    } else {
      console.error('[RENDER] ❌ Элемент #root не найден');
    }
  } catch (error) {
    console.error('[RENDER] ❌ Ошибка рендеринга UniFarm:', error);
    console.error('[RENDER] ❌ Стек ошибки:', (error as Error).stack);
  }
}

// Безопасный запуск рендеринга
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}
