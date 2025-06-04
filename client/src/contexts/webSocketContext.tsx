import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

interface WebSocketContextType {
  connectionStatus: ConnectionStatus;
  sendMessage: (message: any) => void;
  lastMessage: any;
}

const WebSocketContext = createContext<WebSocketContextType>({
  connectionStatus: 'disconnected',
  sendMessage: () => {},
  lastMessage: null,
});

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<any>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = () => {
    try {
      // Используем локальный WebSocket сервер
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      const newSocket = new WebSocket(wsUrl);
      setSocket(newSocket);
      setConnectionStatus('connecting');

      newSocket.onopen = () => {
        console.log('[WebSocket] Подключение установлено');
        setConnectionStatus('connected');
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      newSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
        } catch (error) {
          console.error('[WebSocket] Ошибка парсинга сообщения:', error);
        }
      };

      newSocket.onclose = () => {
        console.log('[WebSocket] Соединение закрыто');
        setConnectionStatus('disconnected');
        setSocket(null);
        
        // Переподключение через 5 секунд
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, 5000);
        }
      };

      newSocket.onerror = (error) => {
        console.error('[WebSocket] Ошибка соединения:', error);
      };

    } catch (error) {
      console.error('[WebSocket] Ошибка создания соединения:', error);
      setConnectionStatus('disconnected');
    }
  };

  const sendMessage = (message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('[WebSocket] Ошибка отправки сообщения:', error);
      }
    }
  };

  useEffect(() => {
    // Временно отключаем WebSocket подключения
    console.log('[WebSocket] Подключения временно отключены для реструктуризации');

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.close();
      }
    };
  }, []);

  const value: WebSocketContextType = {
    connectionStatus,
    sendMessage,
    lastMessage,
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
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};