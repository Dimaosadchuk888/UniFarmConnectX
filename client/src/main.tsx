// Импорты для React
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Импортируем функцию инициализации из telegramService
import { initTelegramWebApp } from './services/telegramService';

// Объявление интерфейса Window для доступа к Telegram WebApp
// Вместо добавления Buffer, который не работает в Telegram Mini App,
// мы используем стандартные WebAPI для работы с бинарными данными

// Обеспечиваем глобальный процесс для приложения
interface ProcessEnv {
  env: Record<string, string | undefined>
}

// Устанавливаем глобальный процесс, который требуется некоторым библиотекам
window.process = { env: {} } as any;

// Инициализируем Telegram WebApp до рендеринга React-приложения
initTelegramWebApp();

// Отладочная проверка состояния Telegram объекта
console.log('[TG INIT] Telegram object state:', {
  telegramDefined: typeof window.Telegram !== 'undefined',
  webAppDefined: typeof window.Telegram?.WebApp !== 'undefined',
  initDataLength: window.Telegram?.WebApp?.initData?.length || 0,
  savedInitData: sessionStorage.getItem('telegramInitData')?.length || 0
});

// Для гарантии инициализации также добавим слушатель DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  console.log('[main] DOMContentLoaded event, повторная проверка инициализации Telegram WebApp');
  // Повторно вызываем функцию после полной загрузки DOM
  initTelegramWebApp();
});

// Рендеринг React-приложения
createRoot(document.getElementById("root")!).render(<App />);
