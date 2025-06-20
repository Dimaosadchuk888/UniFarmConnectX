import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  const [reconnectTimeout, setReconnectTimeout] = useState<number | null>(null);

  // Функция для создания WebSocket соединения
  const createWebSocket = () => {
    try {
      // Получаем user_id из localStorage или sessionStorage
      let userId = null;
      try {
        // Сначала проверяем в sessionStorage
        userId = sessionStorage.getItem('user_id');

        // Если нет в sessionStorage, пробуем localStorage
        if (!userId) {
          userId = localStorage.getItem('user_id');
        }

        // Если всё еще нет, проверяем другие возможные ключи
        if (!userId) {
          // Проверяем другие возможные ключи хранилища
          const possibleKeys = ['userId', 'currentUserId', 'authUserId'];
          for (const key of possibleKeys) {
            const value = localStorage.getItem(key) || sessionStorage.getItem(key);
            if (value) {
              userId = value;
              break;
            }
          }
        }

        console.log('[WebSocket] Retrieved user_id for connection:', userId ? userId : 'not found');
      } catch (e) {
        console.error('[WebSocket] Error retrieving user_id from storage:', e);
      }

      // Получаем корректный URL для WebSocket с учетом Replit
      const wsUrl = import.meta.env.VITE_WS_URL || 
                   `wss://${window.location.host}/ws${userId ? `?user_id=${userId}` : ''}`;

      console.log('[WebSocket] Connecting to WebSocket:', wsUrl);

      const newSocket = new WebSocket(wsUrl);
      setSocket(newSocket);
      setConnectionStatus('connecting');

      // Устанавливаем обработчики событий
      newSocket.onopen = (event) => {
        console.log('[WebSocket] Connection established');
        setConnectionStatus('connected');

        // Отправляем пинг сразу после подключения
        try {
          newSocket.send(JSON.stringify({ 
            type: 'ping', 
            timestamp: new Date().toISOString() 
          }));
        } catch (error) {
          console.error('[WebSocket] Error sending initial ping:', error);
        }
      };

      newSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', message);
          setLastMessage(message);

          // Автоматически отвечаем на пинг
          if (message.type === 'ping') {
            try {
              newSocket.send(JSON.stringify({ 
                type: 'pong', 
                timestamp: message.timestamp 
              }));
            } catch (error) {
              console.error('[WebSocket] Error sending pong:', error);
            }
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      newSocket.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', event.code, event.reason);
        setConnectionStatus('disconnected');

        // Запускаем переподключение с небольшой задержкой
        const randomDelay = 3000 + Math.random() * 1000;
        console.log(`[WebSocket] Reconnecting in ${Math.round(randomDelay)}ms...`);

        const timeout = window.setTimeout(() => {
          createWebSocket();
        }, randomDelay);

        setReconnectTimeout(timeout);
      };

      newSocket.onerror = (event) => {
        console.error('[WebSocket] Error occurred');
        // Не меняем статус здесь, т.к. onclose сработает автоматически
      };

    } catch (error) {
      console.error('[WebSocket] Error creating connection:', error);
      setConnectionStatus('disconnected');

      // Пытаемся переподключиться при ошибке создания
      const timeout = window.setTimeout(() => {
        createWebSocket();
      }, 5000);

      setReconnectTimeout(timeout);
    }
  };

  // Функция для отправки сообщений
  const sendMessage = (message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(typeof message === 'string' ? message : JSON.stringify(message));
      } catch (error) {
        console.error('[WebSocket] Error sending message:', error);
      }
    } else {
      console.warn('[WebSocket] Cannot send message: connection not open');
    }
  };

  // Устанавливаем соединение при монтировании компонента
  useEffect(() => {
    createWebSocket();

    // Настраиваем периодическую отправку пингов
    const pingInterval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify({ 
            type: 'ping', 
            timestamp: new Date().toISOString() 
          }));
        } catch (error) {
          console.error('[WebSocket] Error sending ping:', error);
        }
      }
    }, 30000); // Пинг каждые 30 секунд

    return () => {
      // Очищаем ресурсы при размонтировании
      if (socket) {
        socket.close();
      }

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      clearInterval(pingInterval);
    };
  }, []); // Пустой массив зависимостей для выполнения только при монтировании

  return (
    <WebSocketContext.Provider
      value={{
        connectionStatus,
        sendMessage,
        lastMessage,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

// Хук для использования WebSocket контекста
export const useWebSocket = () => useContext(WebSocketContext);

export default WebSocketContext;