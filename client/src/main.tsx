import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Объявление интерфейса Window для доступа к Telegram WebApp
// Вместо добавления Buffer, который не работает в Telegram Mini App,
// мы используем стандартные WebAPI для работы с бинарными данными

// Обеспечиваем простой процесс для Telegram WebApp
window.process = { env: {} };

// Telegram WebApp integration setup
const initTelegramWebApp = () => {
  if (window.Telegram?.WebApp) {
    const webApp = window.Telegram.WebApp;
    webApp.expand(); // Расширяем приложение на весь экран
    webApp.ready(); // Сообщаем Telegram, что приложение инициализировано
    
    // Логируем информацию о WebApp для отладки
    console.log('✅ Telegram WebApp initialized', {
      hasTelegramObject: !!window.Telegram,
      hasWebApp: !!window.Telegram?.WebApp,
      initData: typeof window.Telegram?.WebApp?.initData === 'string' 
        ? window.Telegram?.WebApp?.initData?.substring(0, 20) + '...' 
        : 'not available',
      platform: window.Telegram?.WebApp?.platform,
      colorScheme: window.Telegram?.WebApp?.colorScheme,
    });
  } else {
    console.log('⚠️ Telegram WebApp not available (normal when running outside Telegram)');
  }
};

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initTelegramWebApp);

createRoot(document.getElementById("root")!).render(<App />);
