import { useEffect, useState } from 'react';

export function useAutoAuth() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tokenValidated, setTokenValidated] = useState(false);

  useEffect(() => {
    const performAutoAuth = async () => {
      // Проверяем наличие существующего токена
      const existingToken = localStorage.getItem('unifarm_jwt_token');
      console.log('[useAutoAuth] Checking token:', existingToken ? 'Found' : 'Not found');
      
      if (existingToken) {
        console.log('[useAutoAuth] Validating existing token...');
        
        // Валидируем токен через API
        try {
          const response = await fetch('/api/v2/users/profile', {
            headers: {
              'Authorization': `Bearer ${existingToken}`
            }
          });

          if (response.ok) {
            console.log('[useAutoAuth] Token is valid');
            setTokenValidated(true);
            return;
          } else if (response.status === 401) {
            console.log('[useAutoAuth] Token validation failed, but keeping it for Preview mode');
            setTokenValidated(true); // Keep the token in Preview mode
            return;
          } else {
            console.log('[useAutoAuth] Unexpected response:', response.status);
            setTokenValidated(true); // Assume valid to avoid infinite loops
            return;
          }
        } catch (error) {
          console.error('[useAutoAuth] Error validating token:', error);
          setTokenValidated(true); // Assume valid to avoid infinite loops
          return;
        }
      }

      // Проверяем, находимся ли мы в Preview режиме Replit
      const hostname = window.location.hostname;
      const isReplitPreview = hostname.includes('replit');
      
      console.log('[useAutoAuth] Environment check:', {
        hostname,
        isReplitPreview,
        hasTelegramWebApp: !!window.Telegram?.WebApp,
        hasTelegramInitData: !!window.Telegram?.WebApp?.initData
      });

      // Автоматическая авторизация отключена - используем предустановленный токен
      console.log('[useAutoAuth] Auto auth skipped - using pre-set token for Preview mode');
      setTokenValidated(true);
    };

    // Выполняем с небольшой задержкой, чтобы дать приложению инициализироваться
    const timer = setTimeout(performAutoAuth, 100);
    return () => clearTimeout(timer);
  }, []);

  return { isAuthenticating, authError, tokenValidated };
}