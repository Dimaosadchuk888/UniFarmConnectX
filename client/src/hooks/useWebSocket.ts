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
            const pongMessage = { type: 'pong', timestamp: new Date().toISOString() };
            const serializedMessage = JSON.stringify(pongMessage);
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(serializedMessage);
            }
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
          const nextReconnectCount = reconnectCount + 1;
          console.log(`[WebSocket] Reconnecting (attempt ${nextReconnectCount}/${reconnectAttempts})...`);
          
          // Увеличиваем счетчик попыток переподключения
          setReconnectCount(nextReconnectCount);
          
          // Устанавливаем таймаут для переподключения
          reconnectTimeoutRef.current = setTimeout(() => {
            // Используем функцию для создания нового сокета напрямую, 
            // а не вызываем connect() для предотвращения циклов рендеринга
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws`;
            const newSocket = new WebSocket(wsUrl);
            socketRef.current = newSocket;
            
            // Копируем обработчики событий
            newSocket.onopen = socket.onopen;
            newSocket.onmessage = socket.onmessage;
            newSocket.onclose = socket.onclose;
            newSocket.onerror = socket.onerror;
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
    // Удалили reconnectCount из зависимостей, чтобы избежать циклического вызова
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
  // и используем дополнительную проверку на максимальное количество ошибок
  const [errorCount, setErrorCount] = useState(0);
  const MAX_ERROR_COUNT = 3; // Максимальное количество ошибок, после которых останавливаем попытки подключения
  
  // Функция обработки ошибок WebSocket
  const handleWebSocketError = useCallback(() => {
    setErrorCount(prev => {
      const newCount = prev + 1;
      return newCount;
    });
  }, []);
  
  // Подключаемся только если не превышен лимит ошибок
  useEffect(() => {
    // Если количество ошибок превышает порог, останавливаем попытки
    if (errorCount >= MAX_ERROR_COUNT) {
      console.warn(`[WebSocket] Достигнут предел ошибок (${MAX_ERROR_COUNT}). Подключение WebSocket отключено.`);
      
      // Добавляем информацию в консоль для пользователя
      console.info('%c[WebSocket] Важное сообщение для пользователя:', 'color: #4CAF50; font-weight: bold; font-size: 14px;');
      console.info('%cФункция WebSocket временно недоступна. Это может влиять на некоторые функции приложения, такие как обновление баланса в реальном времени.', 'color: #2196F3; font-size: 12px;');
      console.info('%cПриложение продолжит работать в штатном режиме, но для обновления данных потребуется использовать кнопки обновления или перезагрузку страницы.', 'color: #2196F3; font-size: 12px;');
      
      return;
    }
    
    connect();
    
    // Очищаем ресурсы при размонтировании компонента
    return () => {
      disconnect();
    };
  }, [connect, disconnect, errorCount]);
  
  // Добавляем обработчик ошибок
  useEffect(() => {
    const socketInstance = socketRef.current;
    
    if (socketInstance) {
      const errorHandler = () => {
        handleWebSocketError();
      };
      
      socketInstance.addEventListener('error', errorHandler);
      
      return () => {
        socketInstance.removeEventListener('error', errorHandler);
      };
    }
  }, [handleWebSocketError]);
  
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