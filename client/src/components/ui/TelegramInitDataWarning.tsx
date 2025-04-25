import React, { useEffect, useState } from 'react';
import { isTelegramWebApp } from '@/services/telegramService';

/**
 * Компонент для информационного уведомления о работе в упрощенном режиме для AirDrop
 * Не блокирует доступ к приложению согласно обновленному ТЗ
 */
const TelegramInitDataWarning: React.FC = () => {
  // Всегда возвращаем null, чтобы не показывать предупреждение
  // согласно новому ТЗ - "Удалить или отключить компонент TelegramInitDataWarning"
  return null;
  
  // Ниже закомментирован код старой реализации, который можно восстановить при необходимости
  /*
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
    
    // Проверяем состояние Telegram WebApp и сохраняем информацию в журнал,
    // но не блокируем доступ к приложению
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
          // Проверяем sessionStorage и localStorage
          const sessionInitData = sessionStorage.getItem('telegramInitData');
          const localInitData = localStorage.getItem('telegramInitData');
          
          if (sessionInitData && sessionInitData.trim() !== '') {
            initData = sessionInitData;
            usingCachedData = true;
          } else if (localInitData && localInitData.trim() !== '') {
            initData = localInitData;
            usingCachedData = true;
          }
        } catch (e) {
          console.error('[TelegramInitDataWarning] Error reading from storage:', e);
        }
      }
      
      const initDataLen = typeof initData === 'string' ? initData.length : 0;
      
      // Только логирование для аудита, но не показываем пользователю
      console.log('[AUDIT] TelegramInitDataWarning check:', {
        hasTelegramObj,
        hasWebAppObj,
        initDataLen,
        usingCachedData,
        env: process.env.NODE_ENV,
        isDev
      });
    };
    
    // Выполняем только проверку и логирование
    checkTelegramWebAppState();
  }, []);

  // Функция активации режима разработки (только для информации)
  const enableDevMode = () => {
    localStorage.setItem('dev_mode', 'true');
    localStorage.setItem('telegram_launch', 'true');
    window.location.reload();
  };

  // Всегда возвращаем null - компонент отключен согласно ТЗ
  return null;
  */
};

export default TelegramInitDataWarning;