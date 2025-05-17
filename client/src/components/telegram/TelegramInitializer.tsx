import { useEffect, useState } from 'react';

const TelegramInitializer = () => {
  const [status, setStatus] = useState({
    initialized: false,
    error: null as string | null
  });

  useEffect(() => {
    try {
      // Проверяем наличие Telegram WebApp
      if (!window.Telegram?.WebApp) {
        throw new Error('Telegram WebApp API не найден');
      }

      // Проверяем initData
      const initData = window.Telegram.WebApp.initData;
      console.log('[TelegramInitializer] InitData check:', {
        exists: !!initData,
        length: initData?.length || 0
      });

      // Подтверждаем готовность
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();

      // Логируем успешную инициализацию
      console.log('[TelegramInitializer] Диагностика:', {
        version: window.Telegram.WebApp.version,
        platform: window.Telegram.WebApp.platform,
        viewportHeight: window.Telegram.WebApp.viewportHeight,
        viewportStableHeight: window.Telegram.WebApp.viewportStableHeight,
        isExpanded: window.Telegram.WebApp.isExpanded,
        colorScheme: window.Telegram.WebApp.colorScheme
      });

      setStatus({ initialized: true, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      console.error('[TelegramInitializer] Ошибка:', errorMessage);
      setStatus({ initialized: false, error: errorMessage });
    }
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
