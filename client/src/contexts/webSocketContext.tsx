import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

interface WebSocketContextType {
  connectionStatus: ConnectionStatus;
  sendMessage: (message: any) => void;
  lastMessage: any;
  subscribeToUserUpdates: (userId: number) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  showSystemNotifications?: boolean;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children, showSystemNotifications = false }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<any>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const { toast } = useToast();
  const hasShownDisconnectedToast = useRef<boolean>(false);

  const connect = () => {
    try {
      // Используем локальный WebSocket сервер
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      console.log('[WebSocket] Подключение к:', wsUrl);
      
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
        
        // Показываем уведомление о восстановлении соединения только если было отключение
        if (showSystemNotifications && hasShownDisconnectedToast.current) {
          toast({
            title: "Соединение восстановлено",
            variant: "default"
          });
          hasShownDisconnectedToast.current = false;
        }
        
        // Запускаем heartbeat - отправляем ping каждые 30 секунд
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = window.setInterval(() => {
          if (newSocket.readyState === WebSocket.OPEN) {
            newSocket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            console.log('[WebSocket] Heartbeat ping отправлен');
          }
        }, 30000);
      };

      newSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Обрабатываем pong ответ от сервера
          if (message.type === 'pong') {
            console.log('[WebSocket] Heartbeat pong получен');
            return;
          }
          
          // Обрабатываем обновление баланса
          if (message.type === 'balance_update') {
            console.log('[WebSocket] Получено обновление баланса:', message);
          }
          
          // Обрабатываем активацию TON Boost
          if (message.type === 'TON_BOOST_ACTIVATED') {
            console.log('[WebSocket] Получено уведомление об активации TON Boost:', message);
            toast({
              title: "TON Boost активирован!",
              description: message.data?.message || `Пакет "${message.data?.package_name}" успешно активирован`,
            });
          }
          
          setLastMessage(message);
        } catch (error) {
          console.error('[WebSocket] Ошибка парсинга сообщения:', error);
        }
      };

      newSocket.onclose = () => {
        console.log('[WebSocket] Соединение закрыто');
        setConnectionStatus('disconnected');
        setSocket(null);
        
        // Показываем уведомление об отключении только один раз
        if (showSystemNotifications && !hasShownDisconnectedToast.current) {
          toast({
            title: "Соединение с сервером потеряно",
            variant: "destructive"
          });
          hasShownDisconnectedToast.current = true;
        }
        
        // Очищаем heartbeat при закрытии соединения
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        
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
    // Включаем автоматическое подключение WebSocket
    console.log('[WebSocket] Инициализация WebSocket подключения');
    
    // Откладываем подключение чтобы дать время React полностью инициализироваться
    const timer = setTimeout(() => {
      connect();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (socket) {
        socket.close();
      }
    };
  }, []);

  const subscribeToUserUpdates = (userId: number) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Подписка на обновления пользователя:', userId);
      socket.send(JSON.stringify({
        type: 'subscribe',
        userId: userId
      }));
    }
  };

  const value: WebSocketContextType = {
    connectionStatus,
    sendMessage,
    lastMessage,
    subscribeToUserUpdates,
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
    console.error('useWebSocket called outside of WebSocketProvider');
    // Возвращаем безопасный объект по умолчанию вместо ошибки
    return {
      connectionStatus: 'disconnected' as const,
      sendMessage: () => {},
      lastMessage: null,
      subscribeToUserUpdates: () => {},
    };
  }
  return context;
};