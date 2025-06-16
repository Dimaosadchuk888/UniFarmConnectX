import React, { useState, useEffect } from 'react';
import frontendLogger from '../utils/frontendLogger';

interface TelegramInitDataSolverProps {
  onSuccess: (userData: any) => void;
}

export function TelegramInitDataSolver({ onSuccess }: TelegramInitDataSolverProps) {
  const [status, setStatus] = useState<'checking' | 'waiting' | 'error' | 'success'>('checking');
  const [message, setMessage] = useState('Инициализация Telegram WebApp...');

  useEffect(() => {
    const solveTelegramAuth = async () => {
      frontendLogger.info('[TelegramSolver] Начало диагностики Telegram авторизации');
      
      // Проверяем доступность Telegram WebApp
      if (!window.Telegram?.WebApp) {
        frontendLogger.info('[TelegramSolver] Telegram WebApp недоступен');
        setStatus('error');
        setMessage('Приложение должно быть открыто через Telegram Bot @UniFarming_Bot');
        return;
      }

      const tg = window.Telegram.WebApp;
      frontendLogger.info('[TelegramSolver] Telegram WebApp найден, версия:', tg.version);

      // Инициализируем WebApp правильно
      try {
        tg.ready();
        tg.expand();
        frontendLogger.info('[TelegramSolver] WebApp инициализирован');
      } catch (e) {
        frontendLogger.info('[TelegramSolver] Ошибка инициализации:', e);
      }

      setMessage('Получение данных пользователя...');
      setStatus('waiting');

      // Многоступенчатая проверка с задержками
      for (let attempt = 1; attempt <= 8; attempt++) {
        frontendLogger.info(`[TelegramSolver] Попытка ${attempt}/8`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Проверяем initData
        if (tg.initData && tg.initData.length > 0) {
          frontendLogger.info('[TelegramSolver] initData найден, выполняем авторизацию');
          
          try {
            const response = await fetch('/api/v2/auth/telegram', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData: tg.initData })
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
              frontendLogger.info('[TelegramSolver] Авторизация через initData успешна');
              localStorage.setItem('unifarm_auth_token', data.token);
              setStatus('success');
              onSuccess(data.user);
              return;
            }
          } catch (error) {
            frontendLogger.info('[TelegramSolver] Ошибка авторизации через initData:', error);
          }
        }

        // Проверяем initDataUnsafe
        if (tg.initDataUnsafe?.user) {
          frontendLogger.info('[TelegramSolver] Найден initDataUnsafe, регистрируем пользователя');
          
          try {
            const userData = tg.initDataUnsafe.user;
            const response = await fetch('/api/v2/register/telegram', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                telegram_id: userData.id,
                username: userData.username || '',
                first_name: userData.first_name || '',
                last_name: userData.last_name || '',
                language_code: userData.language_code || 'ru',
                direct_registration: true
              })
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
              frontendLogger.info('[TelegramSolver] Регистрация через initDataUnsafe успешна');
              localStorage.setItem('unifarm_auth_token', data.token);
              setStatus('success');
              onSuccess(data.user);
              return;
            }
          } catch (error) {
            frontendLogger.info('[TelegramSolver] Ошибка регистрации через initDataUnsafe:', error);
          }
        }

        setMessage(`Ожидание данных Telegram (${attempt}/8)...`);
      }

      // Если все попытки неудачны
      frontendLogger.info('[TelegramSolver] Все попытки исчерпаны, данные недоступны');
      setStatus('error');
      setMessage('Не удалось получить данные пользователя из Telegram. Возможно, URL приложения неправильно настроен в BotFather.');
    };

    solveTelegramAuth();
  }, [onSuccess]);

  if (status === 'checking' || status === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-6"></div>
        <h2 className="text-2xl font-bold mb-2">UniFarm</h2>
        <p className="text-lg mb-2">{message}</p>
        <p className="text-sm text-gray-400">Подключение к Telegram...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-8 max-w-md text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-4">Произошла ошибка</h2>
          <p className="text-gray-300 mb-6">{message}</p>
          
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg transition-colors font-medium"
            >
              Попробовать снова
            </button>
            
            <button 
              onClick={() => window.location.href = 'https://t.me/UniFarming_Bot/app'}
              className="w-full bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg transition-colors font-medium"
            >
              Перезагрузить страницу
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-gray-800 rounded-lg text-left text-sm">
            <p className="font-medium mb-2">Возможные решения:</p>
            <ul className="space-y-1 text-gray-400">
              <li>• Убедитесь, что открыли приложение через @UniFarming_Bot</li>
              <li>• Попробуйте закрыть и открыть приложение заново</li>
              <li>• Проверьте стабильность интернет-соединения</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return null;
}