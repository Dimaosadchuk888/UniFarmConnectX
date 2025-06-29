/**
 * WebSocket провайдер без внешних подключений
 */
import React, { createContext, useContext, useCallback } from 'react';
import { WEBSOCKET_CONFIG } from '../config';

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: any) => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Временно отключаем WebSocket подключения
  const isConnected = false;

  const sendMessage = useCallback((message: any) => {
    if (!WEBSOCKET_CONFIG.ENABLED) {
      console.log('[WebSocket] Отключен, сообщение не отправлено:', message);
      return;
    }
    // WebSocket логика будет добавлена позже
  }, []);

  const disconnect = useCallback(() => {
    console.log('[WebSocket] Отключение...');
  }, []);

  const value: WebSocketContextType = {
    isConnected,
    sendMessage,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};