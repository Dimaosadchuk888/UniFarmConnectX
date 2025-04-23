import React, { useState, useEffect } from 'react';

/**
 * Компонент для диагностики интеграции с Telegram Mini App
 * Проверяет наличие и правильность работы Telegram WebApp API
 */
interface TelegramDiagnosticsData {
  basic: {
    isTelegramAvailable: boolean;
    isWebAppAvailable: boolean;
    initDataLength: number;
    hasInitDataUnsafe: boolean;
    hasUser: boolean;
    userId: number | string;
    username: string;
    firstName: string;
    startParam: string;
    authDate: string;
    platform: string;
    version: string;
    hash: string;
    fullInitData: string;
  };
  environment: {
    documentURL: string;
    isIframe: boolean;
    userAgent: string;
  };
  time: string;
}

const TelegramDiagnostics: React.FC = () => {
  const [diagnosticData, setDiagnosticData] = useState<TelegramDiagnosticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        // Базовые проверки Telegram WebApp
        const isTelegramAvailable = !!window.Telegram;
        const isWebAppAvailable = isTelegramAvailable && !!window.Telegram?.WebApp;
        
        // Проверка данных в Telegram WebApp с защитой от undefined
        const initDataLength = isWebAppAvailable ? (window.Telegram?.WebApp?.initData?.length || 0) : 0;
        const hasInitDataUnsafe = isWebAppAvailable && !!window.Telegram?.WebApp?.initDataUnsafe;
        const hasUser = hasInitDataUnsafe && !!window.Telegram?.WebApp?.initDataUnsafe?.user;
        
        const userId = hasUser ? window.Telegram?.WebApp?.initDataUnsafe?.user?.id : 'not available';
        const username = hasUser ? window.Telegram?.WebApp?.initDataUnsafe?.user?.username || 'not available' : 'not available';
        const firstName = hasUser ? window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || 'not available' : 'not available';
        const startParam = isWebAppAvailable ? window.Telegram?.WebApp?.startParam || 'not available' : 'not available';
        const authDate = hasInitDataUnsafe ? window.Telegram?.WebApp?.initDataUnsafe?.auth_date || 'not available' : 'not available';
        const platform = isWebAppAvailable ? window.Telegram?.WebApp?.platform || 'not available' : 'not available';
        const version = isWebAppAvailable ? window.Telegram?.WebApp?.version || 'not available' : 'not available';
        const hash = hasInitDataUnsafe && window.Telegram?.WebApp?.initDataUnsafe?.hash ? 'present' : 'absent';
        const fullInitData = initDataLength > 0 ? 'present' : 'empty';
        
        // Дополнительная информация
        const documentURL = window.document.URL;
        const isIframe = window.self !== window.top;
        const userAgent = window.navigator.userAgent;
        
        // Формируем структуру данных диагностики
        const diagnosticResults: TelegramDiagnosticsData = {
          basic: {
            isTelegramAvailable,
            isWebAppAvailable,
            initDataLength,
            hasInitDataUnsafe,
            hasUser,
            userId,
            username,
            firstName,
            startParam,
            authDate,
            platform,
            version,
            hash,
            fullInitData
          },
          environment: {
            documentURL,
            isIframe,
            userAgent
          },
          time: new Date().toISOString()
        };
        
        setDiagnosticData(diagnosticResults);
        console.log('[АУДИТ] [DIAG] Telegram WebApp State:', diagnosticResults);
      } catch (err) {
        setError(`Ошибка при выполнении диагностики: ${err}`);
        console.error('[АУДИТ] [DIAG] Ошибка диагностики Telegram:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    runDiagnostics();
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
        <span>Выполняется диагностика Telegram WebApp...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-md">
        <h3 className="text-red-700 font-medium">Ошибка диагностики</h3>
        <p className="text-red-600 mt-1">{error}</p>
      </div>
    );
  }
  
  if (!diagnosticData) {
    return <div>Нет данных для отображения</div>;
  }
  
  return (
    <div className="space-y-6">
      {/* Общий статус */}
      <div className={`flex items-center p-4 ${
        diagnosticData.basic.isWebAppAvailable ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30' : 
        'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30'
      } rounded-md`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
          diagnosticData.basic.isWebAppAvailable ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200' : 
          'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-200'
        }`}>
          {diagnosticData.basic.isWebAppAvailable ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
        </div>
        <div>
          <h3 className={`font-medium ${
            diagnosticData.basic.isWebAppAvailable ? 'text-green-800 dark:text-green-300' : 
            'text-yellow-800 dark:text-yellow-300'
          }`}>
            {diagnosticData.basic.isWebAppAvailable ? 'Telegram WebApp доступен' : 'Telegram WebApp недоступен'}
          </h3>
          <p className={`text-sm mt-1 ${
            diagnosticData.basic.isWebAppAvailable ? 'text-green-600 dark:text-green-400' : 
            'text-yellow-600 dark:text-yellow-400'
          }`}>
            {diagnosticData.basic.isWebAppAvailable 
              ? 'API Telegram Mini App успешно инициализирован'
              : 'API Telegram не найден или не инициализирован правильно'}
          </p>
        </div>
      </div>
      
      {/* Базовая информация */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Информация о Telegram WebApp</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Telegram объект</div>
            <div className={`mt-1 font-medium ${diagnosticData.basic.isTelegramAvailable ? 'text-green-600' : 'text-red-600'}`}>
              {diagnosticData.basic.isTelegramAvailable ? 'Доступен' : 'Недоступен'}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">WebApp API</div>
            <div className={`mt-1 font-medium ${diagnosticData.basic.isWebAppAvailable ? 'text-green-600' : 'text-red-600'}`}>
              {diagnosticData.basic.isWebAppAvailable ? 'Доступен' : 'Недоступен'}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">initData</div>
            <div className={`mt-1 font-medium ${diagnosticData.basic.initDataLength > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {diagnosticData.basic.initDataLength > 0 ? `Присутствует (${diagnosticData.basic.initDataLength} байт)` : 'Отсутствует'}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Данные пользователя</div>
            <div className={`mt-1 font-medium ${diagnosticData.basic.hasUser ? 'text-green-600' : 'text-red-600'}`}>
              {diagnosticData.basic.hasUser ? 'Присутствуют' : 'Отсутствуют'}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Запущено в Telegram</div>
            <div className={`mt-1 font-medium ${diagnosticData.environment.isIframe ? 'text-green-600' : 'text-yellow-600'}`}>
              {diagnosticData.environment.isIframe ? 'Да (в iframe)' : 'Нет (открыто напрямую)'}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Платформа</div>
            <div className="mt-1 font-medium text-gray-800 dark:text-white">
              {diagnosticData.basic.platform}
            </div>
          </div>
        </div>
      </div>
      
      {/* Информация о пользователе */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Информация о пользователе</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">ID пользователя</div>
            <div className={`mt-1 font-medium ${typeof diagnosticData.basic.userId === 'number' ? 'text-green-600' : 'text-red-600'}`}>
              {diagnosticData.basic.userId}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Имя пользователя</div>
            <div className={`mt-1 font-medium ${diagnosticData.basic.username !== 'not available' ? 'text-green-600' : 'text-red-600'}`}>
              {diagnosticData.basic.username}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Имя</div>
            <div className={`mt-1 font-medium ${diagnosticData.basic.firstName !== 'not available' ? 'text-green-600' : 'text-red-600'}`}>
              {diagnosticData.basic.firstName}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Start параметр</div>
            <div className={`mt-1 font-medium ${diagnosticData.basic.startParam !== 'not available' ? 'text-green-600' : 'text-yellow-600'}`}>
              {diagnosticData.basic.startParam}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Дата авторизации</div>
            <div className={`mt-1 font-medium ${diagnosticData.basic.authDate !== 'not available' ? 'text-green-600' : 'text-red-600'}`}>
              {diagnosticData.basic.authDate}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Hash</div>
            <div className={`mt-1 font-medium ${diagnosticData.basic.hash === 'present' ? 'text-green-600' : 'text-red-600'}`}>
              {diagnosticData.basic.hash}
            </div>
          </div>
        </div>
      </div>
      
      {/* Техническая информация */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Техническая информация</h3>
        <div className="space-y-3">
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">URL документа</div>
            <div className="mt-1 text-sm overflow-auto max-w-full text-gray-800 dark:text-white break-all">
              {diagnosticData.environment.documentURL}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">User Agent</div>
            <div className="mt-1 text-sm overflow-auto max-w-full text-gray-800 dark:text-white break-all">
              {diagnosticData.environment.userAgent}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Версия WebApp</div>
            <div className="mt-1 text-sm text-gray-800 dark:text-white">
              {diagnosticData.basic.version}
            </div>
          </div>
        </div>
      </div>
      
      {/* Рекомендации по решению проблем */}
      {!diagnosticData.basic.isWebAppAvailable && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 p-4 rounded-md">
          <h3 className="text-lg font-medium text-blue-800 dark:text-blue-500 mb-2">Рекомендации по решению проблем</h3>
          <ul className="list-disc list-inside space-y-2 text-blue-700 dark:text-blue-500">
            <li>Убедитесь, что приложение открыто в Telegram Mini App WebView</li>
            <li>Проверьте, правильно ли указан домен в настройках BotFather</li>
            <li>Перезапустите бота и очистите кэш Telegram</li>
            <li>Проверьте правильность мета-тега viewport для мобильных устройств</li>
            <li>Попробуйте задать meta-тег viewport с content="viewport-fit=cover, width=device-width, initial-scale=1.0"</li>
          </ul>
        </div>
      )}
      
      <div className="text-xs text-gray-500 dark:text-gray-400 text-right mt-2">
        Диагностика выполнена: {new Date(diagnosticData.time).toLocaleString()}
      </div>
    </div>
  );
};

export default TelegramDiagnostics;