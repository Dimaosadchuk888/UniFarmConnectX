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
  reconnectAttempts?: number;
  reconnectInterval?: number;
  autoReconnect?: boolean;
}

/**
 * Хук для работы с WebSocket соединением
 */
const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [reconnectCount, setReconnectCount] = useState<number>(0);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    onOpen,
    onMessage,
    onClose,
    onError,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    autoReconnect = true
  } = options;
  
  /**
   * Инициализация WebSocket соединения
   */
  const connect = useCallback(() => {
    try {
      // Определяем правильный протокол (wss для https, ws для http)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Создаем URL для WebSocket соединения на отдельном пути
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('[WebSocket] Connecting to:', wsUrl);
      
      // Закрываем предыдущее соединение, если оно существует
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
      
      // Создаем новое соединение
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      // Обработчик успешного соединения
      socket.onopen = (event) => {
        console.log('[WebSocket] Connection established');
        setIsConnected(true);
        setReconnectCount(0);
        
        // Вызываем пользовательский обработчик, если он передан
        if (onOpen) onOpen(event);
      };
      
      // Обработчик получения сообщения
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', data);
          setLastMessage(data);
          
          // Автоматически отвечаем на пинги от сервера
          if (data.type === 'ping') {
            send({ type: 'pong', timestamp: new Date().toISOString() });
          }
          
          // Вызываем пользовательский обработчик, если он передан
          if (onMessage) onMessage(data);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };
      
      // Обработчик закрытия соединения
      socket.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', event.code, event.reason);
        setIsConnected(false);
        
        // Вызываем пользовательский обработчик, если он передан
        if (onClose) onClose(event);
        
        // Пытаемся переподключиться, если включено автоматическое переподключение
        if (autoReconnect && reconnectCount < reconnectAttempts) {
          console.log(`[WebSocket] Reconnecting (attempt ${reconnectCount + 1}/${reconnectAttempts})...`);
          
          // Увеличиваем счетчик попыток переподключения
          setReconnectCount((prevCount) => prevCount + 1);
          
          // Устанавливаем таймаут для переподключения
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };
      
      // Обработчик ошибок
      socket.onerror = (event) => {
        console.error('[WebSocket] Error:', event);
        
        // Вызываем пользовательский обработчик, если он передан
        if (onError) onError(event);
      };
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
    }
  }, [
    onOpen,
    onMessage,
    onClose,
    onError,
    reconnectAttempts,
    reconnectInterval,
    autoReconnect,
    reconnectCount
  ]);
  
  /**
   * Отправка сообщения на сервер
   */
  const send = useCallback((message: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        const serializedMessage = typeof message === 'string' 
          ? message 
          : JSON.stringify(message);
        
        socketRef.current.send(serializedMessage);
        return true;
      } catch (error) {
        console.error('[WebSocket] Error sending message:', error);
        return false;
      }
    } else {
      console.warn('[WebSocket] Cannot send message: connection not open');
      return false;
    }
  }, []);
  
  /**
   * Подписка на обновления для пользователя с указанным ID
   */
  const subscribeToUserUpdates = useCallback((userId: number) => {
    return send({
      type: 'subscribe',
      userId
    });
  }, [send]);
  
  /**
   * Принудительное закрытие соединения
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    // Очищаем таймаут переподключения, если он установлен
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
  }, []);
  
  // Устанавливаем соединение при монтировании компонента
  useEffect(() => {
    connect();
    
    // Очищаем ресурсы при размонтировании компонента
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);
  
  return {
    isConnected,
    lastMessage,
    send,
    subscribeToUserUpdates,
    connect,
    disconnect,
    reconnectCount
  };
};

export default useWebSocket;