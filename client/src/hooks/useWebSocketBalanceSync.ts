import { useEffect } from 'react';
import { useWebSocket } from '../contexts/webSocketContext';
import { useUser } from '../contexts/userContext';

/**
 * Hook для синхронизации баланса через WebSocket
 * Слушает WebSocket сообщения об обновлении баланса и обновляет UserContext
 */
export function useWebSocketBalanceSync() {
  const { lastMessage, subscribeToUserUpdates, connectionStatus } = useWebSocket();
  const { userId, refreshBalance } = useUser();

  useEffect(() => {
    // Подписываемся на обновления для текущего пользователя при подключении
    if (userId && connectionStatus === 'connected') {
      console.log('[useWebSocketBalanceSync] Подписка на обновления баланса для пользователя:', userId);
      subscribeToUserUpdates(userId);
    }
  }, [userId, connectionStatus, subscribeToUserUpdates]);
  
  // ТЕСТ ГИПОТЕЗЫ: Увеличиваем интервал до 5 минут для проверки race condition
  useEffect(() => {
    if (!userId) return;
    
    const interval = setInterval(() => {
      console.log('[useWebSocketBalanceSync] Автообновление баланса через интервал (ТЕСТ: 5 мин)');
      refreshBalance(true);
    }, 300000); // 300 секунд = 5 минут (было 30 сек)
    
    return () => clearInterval(interval);
  }, [userId, refreshBalance]);

  useEffect(() => {
    // Обрабатываем сообщения об обновлении баланса
    if (lastMessage && lastMessage.type === 'balance_update') {
      console.log('[useWebSocketBalanceSync] Получено обновление баланса:', lastMessage);
      
      // Проверяем, что обновление для текущего пользователя
      if (lastMessage.userId === userId) {
        console.log('[useWebSocketBalanceSync] Обновляем баланс для текущего пользователя');
        // Обновляем баланс через API для получения актуальных данных
        refreshBalance(true);
      }
    }
  }, [lastMessage, userId, refreshBalance]);

  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus
  };
}