import { useEffect, useState } from 'react';
// ЭТАП 1: Импорт сервиса темы для интеграции
import { initializeTelegramThemeSystem } from '../../services/telegramThemeService';
// ЭТАП 2: Импорт сервиса кнопок для интеграции
import { initializeTelegramButtons } from '../../services/telegramButtonService';
// ЭТАП 3: Импорт объединенного сервиса улучшенных функций
import { initializeTelegramAdvancedFeatures } from '../../services/telegramAdvancedService';

const TelegramInitializer = () => {
  const [status, setStatus] = useState({
    initialized: false,
    error: null as string | null
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeTelegram = async () => {
      try {// Добавляем обработчик события web_app_ready
        const handleWebAppReady = () => {localStorage.setItem('telegram_ready', 'true');
          sessionStorage.setItem('telegram_ready', 'true');
          setIsReady(true);
        };

        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: если есть объект Telegram, сразу отмечаем готовым
        if (typeof window !== 'undefined' && window.Telegram) {handleWebAppReady();
        }

        // Слушаем события WebApp
        if (typeof window !== 'undefined' && window.addEventListener) {
          window.addEventListener('web_app_ready', handleWebAppReady);
        }

        // Упрощенная проверка готовности Telegram WebApp
        const telegramReady = !!(typeof window !== 'undefined' && window.Telegram);

        if (telegramReady && window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp;
          
          try {
            // Расширяем WebApp на весь экран
            if (typeof tg.expand === 'function') tg.expand();

            // Настраиваем тему
            if (typeof tg.setHeaderColor === 'function') tg.setHeaderColor('#1a1a1a');
            if (typeof tg.setBackgroundColor === 'function') tg.setBackgroundColor('#0a0a0a');

            // Включаем закрывающую кнопку
            if (typeof tg.enableClosingConfirmation === 'function') tg.enableClosingConfirmation();

            // Уведомляем о готовности
            if (typeof tg.ready === 'function') tg.ready();
          } catch (e) {}} else {}
        
        // В любом случае разрешаем работу приложения
        setIsReady(true);

        // Очистка обработчика при размонтировании
        return () => {
          if (typeof window !== 'undefined' && window.removeEventListener) {
            window.removeEventListener('web_app_ready', handleWebAppReady);
          }
        };
      } catch (error) {setIsReady(true); // Все равно разрешаем работу
      }
    };

    // Запускаем инициализацию
    const cleanup = initializeTelegram();
    
    // Возвращаем функцию очистки
    return () => {
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then(cleanupFn => {
          if (typeof cleanupFn === 'function') {
            cleanupFn();
          }
        });
      }
    };
  }, []);

  // Возвращаем компонент с информацией о статусе
  return status.error ? (
    <div style={{ padding: '1rem', color: 'red' }}>
      Ошибка инициализации Telegram: {status.error}
    </div>
  ) : null;
}

export { TelegramInitializer };
export default TelegramInitializer;