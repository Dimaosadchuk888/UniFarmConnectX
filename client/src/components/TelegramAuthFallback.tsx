import frontendLogger from "../utils/frontendLogger";
import React, { useState, useEffect } from 'react';

interface TelegramAuthFallbackProps {
  onAuthSuccess: (user: any) => void;
}

export function TelegramAuthFallback({ onAuthSuccess }: TelegramAuthFallbackProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkTelegramAuth = async () => {
      try {
        // Проверяем доступность Telegram WebApp
        if (!window.Telegram?.WebApp) {
          setError('Приложение должно быть открыто в Telegram');
          setIsChecking(false);
          return;
        }

        const tg = window.Telegram.WebApp;
        
        // Ждем инициализации
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Проверяем initData
        if (tg.initData && tg.initData.length > 0) {
          frontendLogger.info('[TelegramAuthFallback] initData найден, выполняем стандартную авторизацию');
          
          const response = await fetch('/api/v2/auth/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData })
          });

          const data = await response.json();
          
          if (response.ok && data.success) {
            localStorage.setItem('unifarm_auth_token', data.token);
            onAuthSuccess(data.user);
            return;
          }
        }

        // Если initData недоступен, проверяем initDataUnsafe
        if (tg.initDataUnsafe?.user) {
          frontendLogger.info('[TelegramAuthFallback] Используем initDataUnsafe для регистрации');
          
          const response = await fetch('/api/v2/register/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegram_id: tg.initDataUnsafe.user.id,
              username: tg.initDataUnsafe.user.username || '',
              first_name: tg.initDataUnsafe.user.first_name || '',
              last_name: tg.initDataUnsafe.user.last_name || '',
              language_code: tg.initDataUnsafe.user.language_code || 'ru',
              direct_registration: true
            })
          });

          const data = await response.json();
          
          if (response.ok && data.success) {
            localStorage.setItem('unifarm_auth_token', data.token);
            onAuthSuccess(data.user);
            return;
          }
        }

        setError('Не удалось получить данные пользователя из Telegram');
        
      } catch (error) {
        frontendLogger.error('[TelegramAuthFallback] Ошибка авторизации:', error);
        setError('Ошибка при авторизации через Telegram');
      } finally {
        setIsChecking(false);
      }
    };

    checkTelegramAuth();
  }, [onAuthSuccess]);

  if (isChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-lg">Загрузка приложения...</p>
        <p className="text-sm text-gray-400 mt-2">Получение данных из Telegram</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 max-w-md text-center">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Произошла ошибка</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors"
          >
            Попробовать снова
          </button>
          <button 
            onClick={() => window.location.href = 'https://t.me/UniFarming_Bot'}
            className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg transition-colors ml-2"
          >
            Открыть в Telegram
          </button>
        </div>
      </div>
    );
  }

  return null;
}