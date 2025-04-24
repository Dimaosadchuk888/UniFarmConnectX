import React, { useEffect, useState } from 'react';
import { isTelegramWebApp } from '@/services/telegramService';

/**
 * Компонент для отображения предупреждения, когда Telegram WebApp не инициализирован правильно
 * или когда initData отсутствует/пустой
 */

// Используем типы из глобального объявления в App.tsx
// Не переопределяем Window.Telegram, чтобы избежать конфликтов типов
const TelegramInitDataWarning: React.FC = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [initDataLength, setInitDataLength] = useState(0);
  const [hasTelegram, setHasTelegram] = useState(true);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    // Проверяем режим разработки (из localStorage или из process.env)
    const checkDevMode = () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        const devMode = localStorage.getItem('dev_mode') === 'true';
        const envDevMode = process.env.NODE_ENV === 'development';
        setIsDevMode(devMode || envDevMode);
        return devMode || envDevMode;
      }
      return process.env.NODE_ENV === 'development';
    };
    
    // Проверяем состояние Telegram WebApp
    const checkTelegramWebAppState = () => {
      // Проверяем наличие API
      const hasTelegramObj = typeof window !== 'undefined' && !!window.Telegram;
      const hasWebAppObj = hasTelegramObj && !!window.Telegram?.WebApp;
      
      // Проверяем initData - сначала в объекте Telegram, затем в localStorage
      let initData = hasWebAppObj && window.Telegram?.WebApp?.initData 
                     ? window.Telegram.WebApp.initData : '';
                     
      // Проверяем режим разработки
      const isDev = checkDevMode();
                     
      // Если Telegram initData не доступно, проверяем localStorage (согласно п.1.2 ТЗ)
      let usingCachedData = false;
      
      // В режиме разработки кэшируем Telegram Launch для эмуляции Mini App
      if (isDev && !hasTelegramObj && localStorage.getItem('telegram_launch') === 'true') {
        usingCachedData = true;
        console.log('[DEV] Using cached telegram_launch flag for development');
      }
      
      if ((!initData || initData.trim() === '') && typeof window !== 'undefined') {
        try {
          // Сначала проверяем sessionStorage (рекомендуется для чувствительных данных)
          const sessionInitData = sessionStorage.getItem('telegramInitData');
          if (sessionInitData && sessionInitData.trim() !== '') {
            initData = sessionInitData;
            usingCachedData = true;
            console.log('[TelegramInitDataWarning] Using cached initData from sessionStorage');
          }
          
          // Затем проверяем localStorage (для совместимости)
          if ((!initData || initData.trim() === '') && window.localStorage) {
            const savedInitData = localStorage.getItem('telegramInitData');
            if (savedInitData && savedInitData.trim() !== '') {
              initData = savedInitData;
              usingCachedData = true;
              console.log('[TelegramInitDataWarning] Using cached initData from localStorage');
            }
            
            // Для режима разработки - проверяем кэшированные данные пользователя
            if (isDev && localStorage.getItem('telegram_user_data')) {
              usingCachedData = true;
              console.log('[DEV] Using cached Telegram user data for development');
            }
          }
        } catch (e) {
          console.error('[TelegramInitDataWarning] Error reading from storage:', e);
        }
      }
      
      const initDataLen = typeof initData === 'string' ? initData.length : 0;
      
      setHasTelegram(hasTelegramObj && hasWebAppObj);
      setInitDataLength(initDataLen);
      setUsingCachedData(usingCachedData);
      
      // По ТЗ: Если данных нет — отображать сообщение: «Приложение не открыто из Telegram».
      // Но теперь учитываем и данные из localStorage и режим разработки
      const hasValidData = initDataLen > 0 || usingCachedData;
      const shouldShowWarning = !isDev && !hasValidData;
      
      setShowWarning(shouldShowWarning);
      
      console.log('[AUDIT] TelegramInitDataWarning check:', {
        hasTelegramObj,
        hasWebAppObj,
        initDataLen,
        usingCachedData,
        shouldShowWarning,
        env: process.env.NODE_ENV,
        isDev
      });
    };
    
    // Проверяем при монтировании
    checkTelegramWebAppState();
    
    // И повторно проверяем через короткий промежуток времени
    // для случаев, когда Telegram WebApp инициализируется с задержкой
    const timeoutId = setTimeout(checkTelegramWebAppState, 3000);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // Функция активации режима разработки
  const enableDevMode = () => {
    // Создаем тестовые данные
    const testUserData = {
      id: 1,
      username: 'dev_user',
      first_name: 'Test',
      last_name: 'User'
    };
    
    // Генерируем фиктивный initData для тестирования
    const mockInitData = 'dev_mode=true&user=%7B%22id%22%3A1%2C%22first_name%22%3A%22Test%22%7D&auth_date=1619631535';
    
    // Сохраняем данные в localStorage (для долгосрочного хранения)
    localStorage.setItem('dev_mode', 'true');
    localStorage.setItem('telegram_launch', 'true');
    localStorage.setItem('telegram_user_data', JSON.stringify(testUserData));
    localStorage.setItem('telegramInitData', mockInitData);
    
    // Сохраняем данные также в sessionStorage (для текущей сессии)
    try {
      sessionStorage.setItem('telegramInitData', mockInitData);
      console.log('[DEV] Saved mock initData to sessionStorage');
    } catch (e) {
      console.error('[DEV] Error saving to sessionStorage:', e);
    }
    
    alert('🛠️ Режим разработки включен! Страница будет перезагружена.');
    window.location.reload();
  };

  if (!showWarning) {
    return null;
  }

  return (
    <div className={`${usingCachedData ? 'bg-blue-500/90' : 'bg-amber-500/90'} text-black p-3 rounded-lg shadow-lg max-w-md mx-auto mb-4 mt-3`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${usingCachedData ? 'text-blue-800' : 'text-amber-800'}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className={`text-sm font-medium ${usingCachedData ? 'text-blue-900' : 'text-amber-900'}`}>
            {usingCachedData ? 'Информация о Telegram-сессии' : 'Предупреждение о доступе к Telegram'}
          </h3>
          <div className={`mt-2 text-xs ${usingCachedData ? 'text-blue-800' : 'text-amber-800'}`}>
            {usingCachedData ? (
              <>
                <p>
                  <strong>Используются сохраненные данные Telegram из предыдущей сессии.</strong>
                </p>
                <p className="mt-1">
                  Приложение будет использовать ранее сохраненные данные аутентификации (согласно п.1.2 ТЗ).
                  {initDataLength > 0 && ` Длина сохраненных данных: ${initDataLength}.`}
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>Приложение не открыто из Telegram.</strong>
                </p>
                <p className="mt-1">
                  {!hasTelegram 
                    ? "Отсутствует доступ к Telegram API. Откройте через официальный клиент Telegram."
                    : `Telegram initData отсутствует (длина: ${initDataLength}). Перезапустите приложение в Telegram.`
                  }
                </p>
                <p className="mt-2">
                  <button 
                    onClick={enableDevMode}
                    className="px-3 py-1 text-xs bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors"
                  >
                    Включить режим разработки
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramInitDataWarning;