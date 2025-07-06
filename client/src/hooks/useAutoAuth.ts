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
            console.log('[useAutoAuth] Token is invalid or expired, removing...');
            localStorage.removeItem('unifarm_jwt_token');
            // Продолжаем с авто-авторизацией
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

      // Автоматическая авторизация только в Preview режиме без Telegram WebApp
      if (isReplitPreview && !window.Telegram?.WebApp?.initData) {
        console.log('[useAutoAuth] Starting auto auth for Replit Preview');
        setIsAuthenticating(true);
        
        try {
          const response = await fetch('/api/v2/auth/telegram', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              direct_registration: true,
              telegram_id: 88888848,
              username: 'preview_user',
              first_name: 'Preview'
            })
          });

          const data = await response.json();
          console.log('[useAutoAuth] Auth response:', { status: response.status, data });

          if (response.ok && data.success && data.data?.token) {
            console.log('[useAutoAuth] Auto auth successful, saving token');
            localStorage.setItem('unifarm_jwt_token', data.data.token);
            
            // Перезагружаем страницу для применения токена
            console.log('[useAutoAuth] Reloading page...');
            window.location.reload();
          } else {
            const error = data.error || 'Auto auth failed';
            console.error('[useAutoAuth] Auth failed:', error);
            setAuthError(error);
          }
        } catch (error) {
          console.error('[useAutoAuth] Auth error:', error);
          setAuthError(error instanceof Error ? error.message : 'Unknown error');
        } finally {
          setIsAuthenticating(false);
        }
      }
    };

    // Выполняем с небольшой задержкой, чтобы дать приложению инициализироваться
    const timer = setTimeout(performAutoAuth, 100);
    return () => clearTimeout(timer);
  }, []);

  return { isAuthenticating, authError, tokenValidated };
}