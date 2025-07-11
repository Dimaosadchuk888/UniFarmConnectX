import { useWebSocketBalanceSync } from '../hooks/useWebSocketBalanceSync';

/**
 * Компонент для синхронизации баланса через WebSocket
 * Не рендерит UI, только управляет WebSocket подключением
 */
export function WebSocketBalanceSync() {
  const { isConnected, connectionStatus } = useWebSocketBalanceSync();
  
  // Компонент не рендерит ничего видимого
  // Он только обеспечивает синхронизацию баланса
  if (process.env.NODE_ENV === 'development') {
    console.log('[WebSocketBalanceSync] Статус подключения:', connectionStatus);
  }
  
  return null;
}