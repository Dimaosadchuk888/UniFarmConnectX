import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

interface WebSocketContextType {
  isConnected: boolean;
  lastMessageTimestamp: number | null;
  sendMessage: (message: any) => void;
  reconnect: () => void;
}

// Создаем контекст с начальными значениями
const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  lastMessageTimestamp: null,
  sendMessage: () => {},
  reconnect: () => {}
});

// Хук для использования контекста WebSocket
export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

/**
 * Провайдер контекста WebSocket
 * Предоставляет информацию о состоянии WebSocket соединения и методы для работы с ним
 */
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<number | null>(null);
  
  // Ссылка на WebSocket соединение
  const webSocketRef = useRef<WebSocket | null>(null);
  
  // Таймер для автоматического переподключения
  const reconnectTimerRef = useRef<number | null>(null);
  
  // Функция инициализации WebSocket соединения
  const initializeWebSocket = () => {
    try {
      // Закрываем предыдущее соединение, если оно существует
      if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
        webSocketRef.current.close();
      }
      
      // Определяем URL для WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('[WebSocketContext] Connecting to WebSocket server:', wsUrl);
      
      // Создаем новое соединение
      const socket = new WebSocket(wsUrl);
      webSocketRef.current = socket;
      
      // Обработчик открытия соединения
      socket.onopen = () => {
        console.log('[WebSocketContext] WebSocket connection established');
        setIsConnected(true);
        
        // Отправляем ping, чтобы проверить соединение
        sendPing();
        
        // Очищаем таймер переподключения, если он был установлен
        if (reconnectTimerRef.current !== null) {
          window.clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };
      
      // Обработчик получения сообщения
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocketContext] Message received:', data);
          
          // Обновляем временную метку последнего сообщения
          setLastMessageTimestamp(Date.now());
          
          // Если получили pong, отправляем следующий ping через 15 секунд
          if (data.type === 'pong') {
            setTimeout(sendPing, 15000);
          }
        } catch (error) {
          console.error('[WebSocketContext] Error parsing WebSocket message:', error);
        }
      };
      
      // Обработчик ошибки
      socket.onerror = (error) => {
        console.error('[WebSocketContext] WebSocket error:', error);
        setIsConnected(false);
      };
      
      // Обработчик закрытия соединения
      socket.onclose = (event) => {
        console.log('[WebSocketContext] WebSocket connection closed:', event.code, event.reason);
        setIsConnected(false);
        
        // Устанавливаем таймер для переподключения через 3 секунды
        reconnectTimerRef.current = window.setTimeout(() => {
          console.log('[WebSocketContext] Attempting to reconnect...');
          initializeWebSocket();
        }, 3000);
      };
    } catch (error) {
      console.error('[WebSocketContext] Error initializing WebSocket:', error);
      setIsConnected(false);
      
      // Устанавливаем таймер для переподключения через 5 секунд
      reconnectTimerRef.current = window.setTimeout(() => {
        console.log('[WebSocketContext] Attempting to reconnect after error...');
        initializeWebSocket();
      }, 5000);
    }
  };
  
  // Функция для отправки ping-сообщения
  const sendPing = () => {
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      const pingMessage = {
        type: 'ping',
        timestamp: new Date().toISOString()
      };
      
      webSocketRef.current.send(JSON.stringify(pingMessage));
      console.log('[WebSocketContext] Ping sent');
    }
  };
  
  // Функция для отправки сообщения через WebSocket
  const sendMessage = (message: any) => {
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      webSocketRef.current.send(JSON.stringify(message));
      console.log('[WebSocketContext] Message sent:', message);
    } else {
      console.warn('[WebSocketContext] Cannot send message, WebSocket is not open');
    }
  };
  
  // Функция для ручного переподключения
  const reconnect = () => {
    console.log('[WebSocketContext] Manual reconnection triggered');
    initializeWebSocket();
  };
  
  // Инициализируем WebSocket соединение при монтировании компонента
  useEffect(() => {
    console.log('[WebSocketContext] Initializing WebSocket provider');
    initializeWebSocket();
    
    // Очистка при размонтировании
    return () => {
      console.log('[WebSocketContext] Cleaning up WebSocket');
      
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);
  
  // Значение контекста
  const value: WebSocketContextType = {
    isConnected,
    lastMessageTimestamp,
    sendMessage,
    reconnect
  };
  
  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketProvider;