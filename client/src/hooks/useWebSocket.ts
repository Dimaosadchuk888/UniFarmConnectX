import { useState, useCallback, useRef } from 'react';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface UseWebSocketOptions {
  onOpen?: (event: Event) => void;
  onMessage?: (data: any) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  reconnectInterval?: number;
}

/**
 * Хук для работы с WebSocket соединением - отключен для стабильности
 */
export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    // WebSocket отключен
    setIsConnected(false);
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    // WebSocket отключен
  }, []);

  return {
    isConnected,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
  };
};

export default useWebSocket;