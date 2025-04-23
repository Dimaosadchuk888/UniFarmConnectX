import React, { useEffect, useState } from 'react';

/**
 * Компонент для диагностики инициализации Telegram WebApp
 * Позволяет проверить наличие Telegram SDK и правильность передачи initData
 */

interface TelegramData {
  isTelegramAvailable: boolean;
  isWebAppAvailable: boolean;
  initDataLength: number;
  hasInitDataUnsafe: boolean;
  userId: string;
  username: string;
  firstName: string;
  startParam: string;
  authDate: string;
  platform: string;
  version: string;
  hash: string;
  fullInitData: string;
  documentURL: string;
  isIframe: boolean;
  userAgent: string;
  time: string;
}

const TelegramDiagnostics: React.FC = () => {
  const [telegramData, setTelegramData] = useState<TelegramData | null>(null);

  useEffect(() => {
    // Проверяем состояние Telegram WebApp
    const checkTelegramWebAppState = () => {
      const isTelegramAvailable = typeof window !== 'undefined' && !!window.Telegram;
      const isWebAppAvailable = isTelegramAvailable && !!window.Telegram?.WebApp;
      const initData = isWebAppAvailable && window.Telegram?.WebApp?.initData ? window.Telegram.WebApp.initData : '';
      const initDataLength = typeof initData === 'string' ? initData.length : 0;
      const hasInitDataUnsafe = isWebAppAvailable && !!window.Telegram?.WebApp?.initDataUnsafe;
      
      // Извлекаем данные пользователя, если они доступны
      let userId = 'not available';
      let username = 'not available';
      let firstName = 'not available';
      let startParam = 'not available';
      let authDate = 'not available';
      let platform = 'not available';
      let version = 'not available';
      let hash = 'absent';
      
      if (isWebAppAvailable && hasInitDataUnsafe) {
        const userData = window.Telegram.WebApp.initDataUnsafe.user;
        userId = userData?.id ? String(userData.id) : 'undefined';
        username = userData?.username || 'undefined';
        firstName = userData?.first_name || 'undefined';
        startParam = window.Telegram.WebApp.startParam || 'undefined';
        authDate = window.Telegram.WebApp.initDataUnsafe.auth_date || 'undefined';
        platform = window.Telegram.WebApp.platform || 'undefined';
        version = window.Telegram.WebApp.version || 'undefined';
        hash = window.Telegram.WebApp.initDataUnsafe.hash || 'undefined';
      }
      
      const data: TelegramData = {
        isTelegramAvailable,
        isWebAppAvailable,
        initDataLength,
        hasInitDataUnsafe,
        userId,
        username,
        firstName,
        startParam,
        authDate,
        platform,
        version,
        hash,
        fullInitData: initData || 'empty',
        documentURL: document.URL,
        isIframe: window !== window.parent,
        userAgent: navigator.userAgent,
        time: new Date().toISOString()
      };
      
      setTelegramData(data);
      console.log('[АУДИТ] [DIAG] Telegram WebApp State:', data);
    };
    
    // Проверяем при монтировании
    checkTelegramWebAppState();
    
    // И повторно проверяем через 3 секунды
    // для случаев, когда Telegram WebApp инициализируется с задержкой
    const timeoutId = setTimeout(checkTelegramWebAppState, 3000);
    
    return () => clearTimeout(timeoutId);
  }, []);

  if (!telegramData) {
    return <div>Загрузка диагностики...</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md mb-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Диагностика Telegram WebApp</h2>
      
      <div className="space-y-3">
        {/* Основные параметры */}
        <div className="grid grid-cols-2 gap-2">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Telegram объект:</div>
          <div className={`text-sm font-medium ${telegramData.isTelegramAvailable ? 'text-green-600' : 'text-red-600'}`}>
            {telegramData.isTelegramAvailable ? 'Доступен' : 'Недоступен'}
          </div>
          
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">WebApp API:</div>
          <div className={`text-sm font-medium ${telegramData.isWebAppAvailable ? 'text-green-600' : 'text-red-600'}`}>
            {telegramData.isWebAppAvailable ? 'Доступен' : 'Недоступен'}
          </div>
          
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">initData длина:</div>
          <div className={`text-sm font-medium ${telegramData.initDataLength > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {telegramData.initDataLength} символов
          </div>
          
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">initDataUnsafe:</div>
          <div className={`text-sm font-medium ${telegramData.hasInitDataUnsafe ? 'text-green-600' : 'text-red-600'}`}>
            {telegramData.hasInitDataUnsafe ? 'Присутствует' : 'Отсутствует'}
          </div>
        </div>
        
        {/* Данные пользователя */}
        <div className="mt-4">
          <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">Данные пользователя:</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">ID пользователя:</div>
            <div className="text-sm">{telegramData.userId}</div>
            
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Имя пользователя:</div>
            <div className="text-sm">{telegramData.username}</div>
            
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Имя:</div>
            <div className="text-sm">{telegramData.firstName}</div>
            
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">startParam:</div>
            <div className="text-sm">{telegramData.startParam}</div>
            
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">auth_date:</div>
            <div className="text-sm">{telegramData.authDate}</div>
            
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Платформа:</div>
            <div className="text-sm">{telegramData.platform}</div>
            
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Версия API:</div>
            <div className="text-sm">{telegramData.version}</div>
            
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Hash:</div>
            <div className="text-sm truncate">{telegramData.hash}</div>
          </div>
        </div>
        
        {/* Окружение */}
        <div className="mt-4">
          <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">Информация об окружении:</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">URL документа:</div>
            <div className="text-sm truncate">{telegramData.documentURL}</div>
            
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Iframe:</div>
            <div className="text-sm">{telegramData.isIframe ? 'Да' : 'Нет'}</div>
            
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">User Agent:</div>
            <div className="text-sm truncate">{telegramData.userAgent}</div>
            
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Время:</div>
            <div className="text-sm">{telegramData.time}</div>
          </div>
        </div>
        
        {/* Сырые данные initData */}
        <div className="mt-4">
          <details>
            <summary className="cursor-pointer text-md font-semibold text-gray-700 dark:text-gray-200">
              Полные данные initData
            </summary>
            <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded overflow-auto max-h-40">
              <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {telegramData.fullInitData}
              </pre>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default TelegramDiagnostics;