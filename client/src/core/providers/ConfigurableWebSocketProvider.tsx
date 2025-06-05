/**
 * Настраиваемый WebSocket провайдер
 */
import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { WEBSOCKET_CONFIG } from '../config';

interface WebSocketContextType {
  isConnected: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  sendMessage: (message: any) => void;
  disconnect: () => void;
  connect: () => void;
  lastMessage: any;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
  enableAutoConnect?: boolean;
  wsUrl?: string;
}

export const ConfigurableWebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  enableAutoConnect = false,
  wsUrl 
}) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [lastMessage, setLastMessage] = useState<any>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const getWebSocketUrl = useCallback(() => {
    if (wsUrl) return wsUrl;
    
    // Используем production URL из конфигурации только если он доступен
    if (WEBSOCKET_CONFIG.PRODUCTION_URL && !WEBSOCKET_CONFIG.USE_LOCAL_FALLBACK) {
      return WEBSOCKET_CONFIG.PRODUCTION_URL;
    }
    
    // Используем локальный WebSocket сервер
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      return `${protocol}//${host}/ws`;
    }
    return 'ws://localhost:3000/ws';
  }, [wsUrl]);

  const connect = useCallback(() => {
    if (!WEBSOCKET_CONFIG.ENABLED) {
      console.log('[WebSocket] Подключения отключены в конфигурации');
      setConnectionStatus('disconnected');
      setIsConnected(false);
      return;
    }

    try {
      const url = getWebSocketUrl();
      console.log(`[WebSocket] Подключение к: ${url}`);
      
      const newSocket = new WebSocket(url);
      setSocket(newSocket);
      setConnectionStatus('connecting');

      newSocket.onopen = () => {
        console.log('[WebSocket] Подключение установлено');
        setConnectionStatus('connected');
        setIsConnected(true);
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
        setIsConnected(false);
        setSocket(null);
        
        // Более интеллектуальное переподключение
        if (enableAutoConnect && !reconnectTimeoutRef.current) {
          // Увеличиваем интервал при проблемах с внешним сервером
          const reconnectDelay = url.includes('uni-farm-connect-xo-osadchukdmitro2.replit.app') 
            ? WEBSOCKET_CONFIG.RECONNECT_INTERVAL * 3  // 9 секунд для внешнего сервера
            : WEBSOCKET_CONFIG.RECONNECT_INTERVAL;     // 3 секунды для локального
            
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, reconnectDelay);
        }
      };

      newSocket.onerror = (error) => {
        console.error('[WebSocket] Ошибка соединения:', error);
        setConnectionStatus('disconnected');
        setIsConnected(false);
        
        // Если это внешний сервер, логируем детали для диагностики
        if (url.includes('uni-farm-connect-xo-osadchukdmitro2.replit.app')) {
          console.warn('[WebSocket] Внешний сервер недоступен, проверьте подключение и аутентификацию');
        }
        setIsConnected(false);
      };

    } catch (error) {
      console.error('[WebSocket] Ошибка создания соединения:', error);
      setConnectionStatus('disconnected');
      setIsConnected(false);
    }
  }, [enableAutoConnect, getWebSocketUrl]);

  const sendMessage = useCallback((message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('[WebSocket] Ошибка отправки сообщения:', error);
      }
    } else {
      console.warn('[WebSocket] Сообщение не отправлено - соединение не активно');
    }
  }, [socket]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socket) {
      socket.close();
    }
    setConnectionStatus('disconnected');
    setIsConnected(false);
  }, [socket]);

  useEffect(() => {
    if (enableAutoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enableAutoConnect, connect, disconnect]);

  const value: WebSocketContextType = {
    isConnected,
    connectionStatus,
    sendMessage,
    disconnect,
    connect,
    lastMessage,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useConfigurableWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useConfigurableWebSocket must be used within ConfigurableWebSocketProvider');
  }
  return context;
};