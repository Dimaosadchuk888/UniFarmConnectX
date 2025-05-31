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
      try {
        console.log('[TelegramInitializer] Начинаем инициализацию...');

        // Добавляем обработчик события web_app_ready
        const handleWebAppReady = () => {
          console.log('[TelegramInitializer] 🎯 Получено событие web_app_ready');
          localStorage.setItem('telegram_ready', 'true');
          sessionStorage.setItem('telegram_ready', 'true');
          setIsReady(true);
        };

        // Слушаем события WebApp
        if (typeof window !== 'undefined' && window.addEventListener) {
          window.addEventListener('web_app_ready', handleWebAppReady);
        }

        // Дополнительная проверка: если WebApp уже есть, сразу отмечаем готовым
        if (window.Telegram?.WebApp) {
          console.log('[TelegramInitializer] 🎯 WebApp уже доступен, отмечаем готовым');
          handleWebAppReady();
        }

        // Ждем готовности Telegram WebApp
        let attempts = 0;
        const maxAttempts = 30;

        const waitForTelegram = (): Promise<boolean> => {
          return new Promise((resolve) => {
            const checkTelegram = () => {
              attempts++;

              if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
                resolve(true);
                return;
              }

              if (attempts >= maxAttempts) {
                console.log('[TelegramInitializer] ⚠️ Telegram WebApp недоступен после ожидания');
                resolve(false);
                return;
              }

              setTimeout(checkTelegram, 200);
            };

            checkTelegram();
          });
        };

        const telegramReady = await waitForTelegram();

        if (telegramReady && window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp;

          // Расширяем WebApp на весь экран
          tg.expand();

          // Настраиваем тему
          tg.setHeaderColor('#1a1a1a');
          tg.setBackgroundColor('#0a0a0a');

          // Включаем закрывающую кнопку
          tg.enableClosingConfirmation();

          // Уведомляем о готовности
          tg.ready();

          // Принудительно отмечаем как готовый
          handleWebAppReady();

          console.log('[TelegramInitializer] ✅ Telegram WebApp успешно инициализирован');
        } else {
          console.log('[TelegramInitializer] ⚠️ Переходим в standalone режим');
          setIsReady(true); // Разрешаем работу в standalone режиме
        }

        // Очистка обработчика при размонтировании
        return () => {
          if (typeof window !== 'undefined' && window.removeEventListener) {
            window.removeEventListener('web_app_ready', handleWebAppReady);
          }
        };
      } catch (error) {
        console.error('[TelegramInitializer] Ошибка инициализации:', error);
        setIsReady(true); // Все равно разрешаем работу
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