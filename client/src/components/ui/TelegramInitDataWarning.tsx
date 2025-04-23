import React, { useEffect, useState } from 'react';
import { isTelegramWebApp } from '@/services/telegramService';

/**
 * Компонент для отображения предупреждения, когда Telegram WebApp не инициализирован правильно
 * или когда initData отсутствует/пустой
 */

// Объявляем тип Window с Telegram для этого модуля
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        [key: string]: any;
      };
    };
  }
}
const TelegramInitDataWarning: React.FC = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [initDataLength, setInitDataLength] = useState(0);
  const [hasTelegram, setHasTelegram] = useState(true);

  useEffect(() => {
    // Проверяем состояние Telegram WebApp
    const checkTelegramWebAppState = () => {
      const hasTelegramObj = typeof window !== 'undefined' && !!window.Telegram;
      const hasWebAppObj = hasTelegramObj && !!window.Telegram?.WebApp;
      const initData = hasWebAppObj && window.Telegram?.WebApp?.initData ? window.Telegram.WebApp.initData : '';
      const initDataLen = typeof initData === 'string' ? initData.length : 0;
      
      setHasTelegram(hasTelegramObj && hasWebAppObj);
      setInitDataLength(initDataLen);
      
      // Никогда не показываем предупреждение - это позволит приложению работать в режиме гостя
      // без блокирующих уведомлений
      const shouldShowWarning = false; // Отключаем предупреждения полностью
      
      setShowWarning(shouldShowWarning);
      
      console.log('[AUDIT] TelegramInitDataWarning check:', {
        hasTelegramObj,
        hasWebAppObj,
        initDataLen,
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
    <div className="bg-amber-500/90 text-black p-3 rounded-lg shadow-lg max-w-md mx-auto mb-4 mt-3">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-800" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-amber-900">
            Предупреждение о доступе к Telegram
          </h3>
          <div className="mt-2 text-xs text-amber-800">
            {!hasTelegram ? (
              <p>
                Telegram API не обнаружен. Приложение может работать с ограниченной функциональностью.
                Попробуйте открыть через официальный клиент Telegram.
              </p>
            ) : (
              <p>
                Telegram initData отсутствует (длина: {initDataLength}). 
                Некоторые функции приложения могут быть недоступны.
                Попробуйте перезапустить приложение или открыть его через официальный клиент Telegram.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramInitDataWarning;