import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from './userContext';

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
  
  // Получаем userId из UserContext
  const { userId: contextUserId } = useUser();

  // Функция для создания WebSocket соединения
  const createWebSocket = () => {
    try {
      // Используем userId из контекста приоритетно
      let userId = contextUserId ? String(contextUserId) : null;
      console.log('[WebSocket] Context userId:', contextUserId);
      
      // Если нет userId из контекста, проверяем localStorage
      if (!userId) {
        try {
          // Проверяем данные сессии UniFarm
          const lastSessionStr = localStorage.getItem('unifarm_last_session');
          if (lastSessionStr) {
            try {
              const lastSession = JSON.parse(lastSessionStr);
              if (lastSession.user_id) {
                userId = String(lastSession.user_id);
                console.log('[WebSocket] Found user_id in unifarm_last_session:', userId);
              }
            } catch (e) {
              console.error('[WebSocket] Error parsing unifarm_last_session:', e);
            }
          }

          // Если не нашли, проверяем другие возможные ключи
          if (!userId) {
            // Проверяем другие возможные ключи хранилища
            const possibleKeys = ['user_id', 'userId', 'currentUserId', 'authUserId'];
            for (const key of possibleKeys) {
              const value = localStorage.getItem(key) || sessionStorage.getItem(key);
              if (value) {
                userId = value;
                break;
              }
            }
          }
        } catch (e) {
          console.error('[WebSocket] Error retrieving user_id from storage:', e);
        }
      }

      console.log('[WebSocket] Retrieved user_id for connection:', userId ? userId : 'not found');
      
      // Не подключаемся если нет валидного userId
      if (!userId || userId === 'not found' || userId === 'null' || userId === 'undefined') {
        console.log('[WebSocket] Skipping connection - no valid user_id available');
        setConnectionStatus('disconnected');
        return;
      }

      // Получаем корректный URL для WebSocket с учетом Replit
      const wsUrl = import.meta.env.VITE_WS_URL || 
                   `wss://${window.location.host}/ws?user_id=${userId}`;

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

        // Проверяем наличие валидного userId перед переподключением
        let validUserId = null;
        
        // Проверяем прямые user_id
        const directUserId = localStorage.getItem('user_id') || localStorage.getItem('userId');
        if (directUserId && directUserId !== 'null' && directUserId !== 'undefined' && directUserId !== 'not found') {
          validUserId = directUserId;
        }
        
        // Проверяем unifarm_last_session
        if (!validUserId) {
          const lastSessionStr = localStorage.getItem('unifarm_last_session');
          if (lastSessionStr) {
            try {
              const lastSession = JSON.parse(lastSessionStr);
              if (lastSession.user_id && lastSession.user_id !== 'null' && lastSession.user_id !== 'undefined') {
                validUserId = String(lastSession.user_id);
              }
            } catch (e) {
              // Игнорируем ошибки парсинга
            }
          }
        }
        
        if (validUserId) {
          // Запускаем переподключение только если есть валидный userId
          const randomDelay = 3000 + Math.random() * 1000;
          console.log(`[WebSocket] Reconnecting in ${Math.round(randomDelay)}ms...`);

          // Временно отключаем автоматическое переподключение
          /*
          const timeout = window.setTimeout(() => {
            createWebSocket();
          }, randomDelay);

          setReconnectTimeout(timeout);
          */
        } else {
          console.log('[WebSocket] Not reconnecting - no valid user_id available');
        }
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

  // Устанавливаем соединение только когда есть userId
  useEffect(() => {
    console.log('[WebSocket] useEffect triggered, contextUserId:', contextUserId);
    
    // Проверяем наличие userId в любом из возможных мест
    const storedUserId = localStorage.getItem('user_id') || 
                        localStorage.getItem('userId') || 
                        localStorage.getItem('unifarm_last_session');
    
    // Ждём пока появится userId из контекста или localStorage
    if (contextUserId || storedUserId) {
      console.log('[WebSocket] Creating connection with userId:', contextUserId || storedUserId);
      // Временно отключаем автоматическое подключение WebSocket
      // createWebSocket();
      console.log('[WebSocket] Auto-connection disabled for debugging');
    } else {
      console.log('[WebSocket] Waiting for userId to be available...');
      // Убеждаемся что соединение закрыто если нет userId
      if (socket) {
        socket.close();
        setSocket(null);
      }
      setConnectionStatus('disconnected');
    }

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
  }, [contextUserId]); // Пересоздаём соединение при изменении userId

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