import { useEffect, useRef } from 'react';
import { useWebSocket } from '../contexts/webSocketContext';
import { useUser } from '../contexts/userContext';
import { balanceCoordinator } from '../services/balanceUpdateCoordinator';

/**
 * Hook для синхронизации баланса через WebSocket
 * Слушает WebSocket сообщения об обновлении баланса и обновляет UserContext
 */
export function useWebSocketBalanceSync() {
  const { lastMessage, subscribeToUserUpdates, connectionStatus } = useWebSocket();
  const { userId, refreshBalance } = useUser();
  const subscriptionRef = useRef<Set<number>>(new Set());

  // Регистрируем координатор обновлений
  useEffect(() => {
    if (userId) {
      console.log(`[useWebSocketBalanceSync] 🎯 Регистрируем координатор для пользователя ${userId}`);
      balanceCoordinator.registerUpdateCallback(userId, async (forceRefresh) => {
        await refreshBalance(forceRefresh);
      });
      
      return () => {
        console.log(`[useWebSocketBalanceSync] 🗑️ Отключаем координатор для пользователя ${userId}`);
        balanceCoordinator.unregisterUpdateCallback(userId);
      };
    }
  }, [userId, refreshBalance]);

  useEffect(() => {
    // Подписываемся на обновления для текущего пользователя при подключении (УМНО)
    if (userId && connectionStatus === 'connected' && !subscriptionRef.current.has(userId)) {
      console.log('[useWebSocketBalanceSync] 🔌 Умная подписка на обновления для пользователя:', userId);
      subscribeToUserUpdates(userId);
      subscriptionRef.current.add(userId);
    }
  }, [userId, connectionStatus, subscribeToUserUpdates]);
  
  // ОПТИМИЗИРОВАННОЕ АВТООБНОВЛЕНИЕ: через координатор, менее агрессивное
  useEffect(() => {
    if (!userId) return;
    
    const interval = setInterval(() => {
      if (userId) {
        console.log('[useWebSocketBalanceSync] 🔄 Автообновление через координатор (2 мин)');
        balanceCoordinator.requestUpdate(userId, 'interval-auto', false); // БЕЗ forceRefresh
      }
    }, 120000); // 2 минуты вместо 30 секунд - менее агрессивно
    
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    // КООРДИНИРОВАННАЯ обработка WebSocket сообщений с дебаунсингом
    if (lastMessage && lastMessage.type === 'balance_update') {
      console.log('[useWebSocketBalanceSync] 📨 Получено WebSocket обновление:', lastMessage);
      
      // Проверяем, что обновление для текущего пользователя
      if (lastMessage.userId === userId && userId) {
        console.log('[useWebSocketBalanceSync] 🎯 Координируем обновление через balanceCoordinator');
        // Используем координатор с дебаунсингом вместо прямого вызова
        balanceCoordinator.requestUpdate(userId, 'websocket-update', true);
      }
    }
  }, [lastMessage, userId]);

  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus
  };
}