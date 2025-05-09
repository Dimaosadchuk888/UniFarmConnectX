// Импортируем основные модули React
import React, { createElement } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Импортируем полифиллы перед взаимодействием с API
import installAllPolyfills from './lib/polyfills';

// Устанавливаем полифиллы в самом начале для исправления проблем с Map и Array.prototype.map
installAllPolyfills();

// Импортируем функции из telegramService
import { 
  initTelegramWebApp, 
  isTelegramWebApp 
} from './services/telegramService';

// Импортируем компонент блокировки
import NotInTelegramWarning from "./components/ui/NotInTelegramWarning";

// Обеспечиваем глобальный процесс для приложения
interface ProcessEnv {
  env: Record<string, string | undefined>
}

// Устанавливаем глобальный процесс, который требуется некоторым библиотекам
window.process = { env: {} } as any;

// ЭТАП 1.1: СТРОГАЯ ПРОВЕРКА ЗАПУСКА ИЗ TELEGRAM
// Проверяем, запущено ли приложение в Telegram до рендеринга
const isTelegramEnvironment = isTelegramWebApp();

// Отладочная проверка состояния Telegram объекта (Этап 10.3: больше не зависим от window.Telegram)
console.log('[TG INIT] Этап 10.3: Проверка среды выполнения:', {
  isTelegramEnvironment,
  isDevelopment: process.env.NODE_ENV === 'development',
  hasLocalStorage: typeof localStorage !== 'undefined',
  hasSessionStorage: typeof sessionStorage !== 'undefined',
  savedGuestId: localStorage.getItem('unifarm_guest_id') || 'отсутствует',
  timestamp: new Date().toISOString()
});

// ЭТАП 1.2: Инициализируем Telegram WebApp до рендеринга React-приложения
// Вызываем, даже если не прошла проверка, чтобы получить хотя бы логи
initTelegramWebApp();

// Для гарантии инициализации также добавим слушатель DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  console.log('[main] DOMContentLoaded event, повторная проверка инициализации Telegram WebApp');
  // Повторно вызываем функцию после полной загрузки DOM
  initTelegramWebApp();
});

// Выбираем компонент для рендеринга в зависимости от результата проверки
let ComponentToRender;

// ЭТАП 1.3: В режиме разработки всегда рендерим приложение
if (process.env.NODE_ENV === 'development' || isTelegramEnvironment) {
  console.log('[TG CHECK] Рендеринг основного приложения: работа в Telegram или режим разработки');
  ComponentToRender = App;
} else {
  // В production, если не в Telegram - показываем блокировочный экран
  console.log('[TG CHECK] Блокировка: приложение запущено вне Telegram');
  ComponentToRender = NotInTelegramWarning;
}

// Рендеринг выбранного компонента
const root = createRoot(document.getElementById("root")!);
root.render(<ComponentToRender />);
