import { useEffect, useState } from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { apiRequest } from '@/lib/queryClient';

interface TelegramAuthProps {
  children: React.ReactNode;
}

export function TelegramAuth({ children }: TelegramAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { isReady, user, initData } = useTelegram();

  useEffect(() => {
    const authenticateUser = async () => {
      console.log('TelegramAuth: Starting authentication process');
      console.log('Telegram ready:', isReady);
      console.log('User data:', user);
      console.log('InitData available:', !!initData);

      if (!isReady) {
        console.log('TelegramAuth: Waiting for Telegram WebApp to be ready');
        return;
      }

      if (!initData || initData.length === 0) {
        console.warn('TelegramAuth: No initData available');
        console.log('initData length:', initData?.length || 0);
        console.log('Environment check: Telegram WebApp available:', !!window.Telegram?.WebApp);
        
        // Дополнительная проверка для Telegram среды
        if (window.Telegram?.WebApp) {
          console.log('Telegram WebApp found, but initData is empty');
          console.log('WebApp version:', window.Telegram.WebApp.version);
          console.log('WebApp platform:', window.Telegram.WebApp.platform);
        }
        
        setError('Не удалось получить данные авторизации из Telegram. Убедитесь, что приложение открыто через бота @UniFarming_Bot.');
        setIsLoading(false);
        return;
      }

      if (!user) {
        console.warn('TelegramAuth: No user data available');
        setError('Не удалось получить данные пользователя из Telegram.');
        setIsLoading(false);
        return;
      }

      try {
        console.log('TelegramAuth: Attempting authentication with initData');
        
        // Сначала пробуем авторизацию
        const authResponse = await apiRequest('/api/v2/auth/telegram', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': initData
          },
          body: JSON.stringify({ 
            initData,
            ref_by: new URLSearchParams(window.location.search).get('ref')
          })
        });

        console.log('Auth response:', authResponse);

        if (authResponse.success && authResponse.token) {
          console.log('✅ Authentication successful');
          
          // Сохраняем токен и данные пользователя
          localStorage.setItem('unifarm_auth_token', authResponse.token);
          localStorage.setItem('unifarm_user_data', JSON.stringify(authResponse.user));
          
          setIsAuthenticated(true);
        } else {
          console.log('Auth failed, trying registration...');
          
          // Если авторизация не прошла, пробуем регистрацию
          const registerResponse = await apiRequest('/api/v2/register/telegram', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Telegram-Init-Data': initData
            },
            body: JSON.stringify({ 
              initData,
              ref_by: new URLSearchParams(window.location.search).get('ref')
            })
          });

          console.log('Register response:', registerResponse);

          if (registerResponse.success && registerResponse.token) {
            console.log('✅ Registration successful');
            
            // Сохраняем токен и данные пользователя
            localStorage.setItem('unifarm_auth_token', registerResponse.token);
            localStorage.setItem('unifarm_user_data', JSON.stringify(registerResponse.user));
            
            setIsAuthenticated(true);
          } else {
            console.log('❌ Both auth and registration failed');
            setError('Не удалось авторизоваться');
          }
        }
      } catch (error) {
        console.error('TelegramAuth error:', error);
        setError('Ошибка авторизации');
      } finally {
        setIsLoading(false);
      }
    };

    if (isReady) {
      authenticateUser();
    }
  }, [isReady, user, initData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Подключение к Telegram...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p className="mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="mb-4">Авторизация не выполнена</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Войти заново
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}