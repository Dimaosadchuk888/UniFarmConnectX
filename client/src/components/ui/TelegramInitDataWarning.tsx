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

  useEffect(() => {
    // Проверяем состояние Telegram WebApp
    const checkTelegramWebAppState = () => {
      // Проверяем наличие API
      const hasTelegramObj = typeof window !== 'undefined' && !!window.Telegram;
      const hasWebAppObj = hasTelegramObj && !!window.Telegram?.WebApp;
      
      // Проверяем initData - сначала в объекте Telegram, затем в localStorage
      let initData = hasWebAppObj && window.Telegram?.WebApp?.initData 
                     ? window.Telegram.WebApp.initData : '';
                     
      // Если Telegram initData не доступно, проверяем localStorage (согласно п.1.2 ТЗ)
      let usingCachedData = false;
      if ((!initData || initData.trim() === '') && typeof window !== 'undefined' && window.localStorage) {
        try {
          const savedInitData = localStorage.getItem('telegramInitData');
          if (savedInitData && savedInitData.trim() !== '') {
            initData = savedInitData;
            usingCachedData = true;
            console.log('[TelegramInitDataWarning] Using cached initData from localStorage');
          }
        } catch (e) {
          console.error('[TelegramInitDataWarning] Error reading from localStorage:', e);
        }
      }
      
      const initDataLen = typeof initData === 'string' ? initData.length : 0;
      
      setHasTelegram(hasTelegramObj && hasWebAppObj);
      setInitDataLength(initDataLen);
      setUsingCachedData(usingCachedData);
      
      // По ТЗ: Если данных нет — отображать сообщение: «Приложение не открыто из Telegram».
      // Но теперь учитываем и данные из localStorage
      const isDev = process.env.NODE_ENV === 'development';
      const hasValidData = initDataLen > 0;
      const shouldShowWarning = !isDev && (!hasValidData);
      
      setShowWarning(shouldShowWarning);
      
      console.log('[AUDIT] TelegramInitDataWarning check:', {
        hasTelegramObj,
        hasWebAppObj,
        initDataLen,
        usingCachedData,
        shouldShowWarning,
        env: process.env.NODE_ENV
      });
    };
    
    // Проверяем при монтировании
    checkTelegramWebAppState();
    
    // И повторно проверяем через короткий промежуток времени
    // для случаев, когда Telegram WebApp инициализируется с задержкой
    const timeoutId = setTimeout(checkTelegramWebAppState, 3000);
    
    return () => clearTimeout(timeoutId);
  }, []);

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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramInitDataWarning;