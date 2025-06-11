import { useState, useEffect, useCallback, useRef } from 'react';

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
 * Хук для работы с WebSocket соединением
 */
export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const [errorCount, setErrorCount] = useState(0);

  const { onOpen, onMessage, onClose, onError, reconnectInterval = 3000 } = options;

  const clearResources = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    clearResources();

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = (event) => {
        console.log('[WebSocket] Подключение установлено');
        setIsConnected(true);
        setErrorCount(0);
        if (onOpen) onOpen(event);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          if (onMessage) onMessage(data);
        } catch (error) {
          console.error('[WebSocket] Ошибка парсинга сообщения:', error);
        }
      };

      socket.onclose = (event) => {
        console.log('[WebSocket] Соединение закрыто');
        setIsConnected(false);
        socketRef.current = null;
        
        if (onClose) onClose(event);

        // Переподключение с экспоненциальной задержкой
        if (errorCount < 5) {
          const delay = Math.min(reconnectInterval * Math.pow(2, errorCount), 30000);
          reconnectTimeoutRef.current = window.setTimeout(() => {
            setErrorCount(prev => prev + 1);
            connect();
          }, delay);
        }
      };

      socket.onerror = (event) => {
        console.error('[WebSocket] Ошибка соединения:', event);
        if (onError) onError(event);
      };

    } catch (error) {
      console.error('[WebSocket] Ошибка создания соединения:', error);
      setIsConnected(false);
    }
  }, [onOpen, onMessage, onClose, onError, reconnectInterval, errorCount, clearResources]);

  const disconnect = useCallback(() => {
    clearResources();
    
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    setIsConnected(false);
  }, [clearResources]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify(message));
      } catch (error) {
        console.error('[WebSocket] Ошибка отправки сообщения:', error);
      }
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
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