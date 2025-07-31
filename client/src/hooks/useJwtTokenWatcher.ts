import { useEffect, useRef } from 'react';
import { tokenRecoveryService } from '../services/tokenRecoveryService';

/**
 * JWT Token Watcher Hook
 * 
 * Мониторит JWT токен каждые 30 секунд и автоматически восстанавливает при исчезновении
 * Предотвращает потерю депозитов из-за Telegram WebApp lifecycle cleanup
 */
export const useJwtTokenWatcher = () => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTokenCheckRef = useRef<string>('');
  const recoveryInProgressRef = useRef<boolean>(false);

  useEffect(() => {
    console.log('[JWT Watcher] Инициализация мониторинга JWT токенов');
    
    const checkJwtToken = async () => {
      try {
        const currentToken = localStorage.getItem('unifarm_jwt_token');
        const currentTime = new Date().toISOString();
        
        // Проверяем наличие токена
        if (!currentToken) {
          console.warn(`[JWT Watcher] 🚨 JWT токен отсутствует! Time: ${currentTime}`);
          
          // Предотвращаем множественные одновременные попытки восстановления
          if (!recoveryInProgressRef.current) {
            recoveryInProgressRef.current = true;
            console.log('[JWT Watcher] Начинаем автоматическое восстановление токена...');
            
            try {
              const recovered = await tokenRecoveryService.recoverJwtToken();
              if (recovered) {
                console.log('[JWT Watcher] ✅ JWT токен успешно восстановлен');
              } else {
                console.error('[JWT Watcher] ❌ Не удалось восстановить JWT токен');
              }
            } catch (error) {
              console.error('[JWT Watcher] ❌ Ошибка при восстановлении токена:', error);
            } finally {
              recoveryInProgressRef.current = false;
            }
          }
          return;
        }

        // Проверяем возраст токена
        const tokenAge = tokenRecoveryService.getTokenAge(currentToken);
        if (tokenAge > 25 * 60 * 1000) { // 25 минут в миллисекундах
          console.warn(`[JWT Watcher] ⚠️ JWT токен старый (${Math.round(tokenAge / 60000)} минут), предупредительное обновление...`);
          
          if (!recoveryInProgressRef.current) {
            recoveryInProgressRef.current = true;
            try {
              await tokenRecoveryService.proactiveTokenRefresh();
              console.log('[JWT Watcher] ✅ Предупредительное обновление токена завершено');
            } catch (error) {
              console.error('[JWT Watcher] ❌ Ошибка предупредительного обновления:', error);
            } finally {
              recoveryInProgressRef.current = false;
            }
          }
        }

        // Логируем изменения токена
        if (currentToken !== lastTokenCheckRef.current) {
          console.log(`[JWT Watcher] 🔄 JWT токен изменился. Age: ${Math.round(tokenAge / 60000)} минут`);
          lastTokenCheckRef.current = currentToken;
        }

      } catch (error) {
        console.error('[JWT Watcher] ❌ Ошибка проверки JWT токена:', error);
      }
    };

    // Выполняем первую проверку сразу
    checkJwtToken();

    // Устанавливаем интервал проверки каждые 30 секунд
    intervalRef.current = setInterval(checkJwtToken, 30000);

    // Cleanup функция
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('[JWT Watcher] Мониторинг JWT токенов остановлен');
      }
    };
  }, []);

  return {
    isWatching: !!intervalRef.current,
    forceCheck: async () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        const checkJwtToken = async () => {
          // Повторяем логику проверки
          const currentToken = localStorage.getItem('unifarm_jwt_token');
          if (!currentToken && !recoveryInProgressRef.current) {
            recoveryInProgressRef.current = true;
            try {
              await tokenRecoveryService.recoverJwtToken();
            } finally {
              recoveryInProgressRef.current = false;
            }
          }
        };
        await checkJwtToken();
        intervalRef.current = setInterval(checkJwtToken, 30000);
      }
    }
  };
};