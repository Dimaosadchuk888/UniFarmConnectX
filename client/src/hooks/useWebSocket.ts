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
  fallbackMode?: boolean;
}

/**
 * Хук для работы с WebSocket соединением
 * Полностью переработанная версия с улучшенной обработкой ошибок
 * и поддержкой режима fallback для работы без WebSocket
 */
const useWebSocket = (options: UseWebSocketOptions = {}) => {
  // Константы
  const MAX_ERROR_COUNT = 3; // Максимальное число ошибок перед переходом в fallback режим
  const CONNECTION_TIMEOUT = 5000; // Таймаут для соединения (5 секунд)
  
  // Состояние
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [reconnectCount, setReconnectCount] = useState<number>(0);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(options.fallbackMode || false);
  
  // Refs для сохранения данных между рендерами
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Опции
  const {
    onOpen,
    onMessage,
    onClose,
    onError,
    reconnectAttempts = 3,
    reconnectInterval = 5000,
    autoReconnect = true
  } = options;
  
  /**
   * Обработка ошибок WebSocket с предельным счетчиком
   */
  const handleWebSocketError = useCallback(() => {
    setErrorCount(prev => {
      const newCount = prev + 1;
      console.warn(`[WebSocket] Error count increased: ${newCount}/${MAX_ERROR_COUNT}`);
      
      // Если достигли максимального количества ошибок, 
      // переходим в режим резервного обновления
      if (newCount >= MAX_ERROR_COUNT) {
        setIsFallbackMode(true);
        
        // Информируем пользователя о переходе в резервный режим
        console.info('%c[WebSocket] Переход в резервный режим', 'color: #FF9800; font-weight: bold; font-size: 14px;');
        console.info('%cФункция WebSocket недоступна. Приложение перешло в режим ручного обновления.', 'color: #2196F3; font-size: 12px;');
        console.info('%cДля обновления данных используйте кнопки обновления или перезагрузите страницу.', 'color: #2196F3; font-size: 12px;');
      }
      
      return newCount;
    });
  }, []);
  
  /**
   * Очистка всех таймеров и ресурсов
   */
  const clearResources = useCallback(() => {
    // Очищаем таймаут переподключения
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Очищаем таймаут соединения
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);
  
  /**
   * Закрытие соединения с очисткой всех ресурсов
   */
  const disconnect = useCallback(() => {
    clearResources();
    
    // Закрываем сокет, если он открыт
    if (socketRef.current) {
      // Пытаемся закрыть нормально, только если сокет открыт или подключается
      if (socketRef.current.readyState === WebSocket.OPEN || 
          socketRef.current.readyState === WebSocket.CONNECTING) {
        try {
          socketRef.current.close(1000, "Normal closure");
        } catch (err) {
          console.error('[WebSocket] Error closing socket:', err);
        }
      }
      
      socketRef.current = null;
    }
    
    setIsConnected(false);
  }, [clearResources]);
  
  /**
   * Инициализация WebSocket соединения с улучшенной обработкой ошибок
   */
  const connect = useCallback(() => {
    // Не пытаемся подключаться в режиме fallback
    if (isFallbackMode) {
      console.log('[WebSocket] Not connecting in fallback mode');
      return;
    }
    
    // Очищаем предыдущие ресурсы перед новым подключением
    clearResources();
    
    try {
      // Закрываем предыдущее соединение
      if (socketRef.current) {
        disconnect();
      }
      
      // Определяем URL для WebSocket соединения
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('[WebSocket] Connecting to:', wsUrl);
      
      // Устанавливаем таймаут соединения
      connectionTimeoutRef.current = setTimeout(() => {
        console.warn('[WebSocket] Connection timeout');
        
        // Если соединение не установлено за отведенное время, считаем это ошибкой
        if (socketRef.current && socketRef.current.readyState !== WebSocket.OPEN) {
          handleWebSocketError();
          disconnect();
          
          // Пытаемся переподключиться, если автоматическое переподключение включено
          // и не превысили лимит ошибок
          if (autoReconnect && errorCount < MAX_ERROR_COUNT && reconnectCount < reconnectAttempts) {
            const nextReconnectCount = reconnectCount + 1;
            setReconnectCount(nextReconnectCount);
            console.log(`[WebSocket] Reconnecting (attempt ${nextReconnectCount}/${reconnectAttempts}) after timeout...`);
            
            // Устанавливаем таймаут для переподключения с экспоненциальной задержкой
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, reconnectInterval * Math.pow(1.5, reconnectCount));
          }
        }
      }, CONNECTION_TIMEOUT);
      
      // Создаем новое соединение
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      // Обработчик успешного соединения
      socket.onopen = (event) => {
        console.log('[WebSocket] Connection established');
        
        // Очищаем таймаут соединения
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        setIsConnected(true);
        setReconnectCount(0);
        setErrorCount(0); // Сбрасываем счетчик ошибок при успешном соединении
        
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
              try {
                socket.send(serializedMessage);
              } catch (sendError) {
                console.error('[WebSocket] Error sending pong:', sendError);
              }
            }
          }
          
          // Вызываем пользовательский обработчик, если он передан
          if (onMessage) onMessage(data);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };
      
      // Обработчик закрытия соединения с улучшенной логикой переподключения
      socket.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', event.code, event.reason);
        
        // Очищаем таймаут соединения
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        setIsConnected(false);
        
        // Вызываем пользовательский обработчик, если он передан
        if (onClose) onClose(event);
        
        // Анормальное закрытие считаем ошибкой
        if (event.code !== 1000 && event.code !== 1001) {
          handleWebSocketError();
        }
        
        // Пытаемся переподключиться, если:
        // 1. Включено автоматическое переподключение
        // 2. Не превышен лимит попыток переподключения
        // 3. Не превышен лимит ошибок
        // 4. Не находимся в режиме fallback
        if (autoReconnect && reconnectCount < reconnectAttempts && 
            errorCount < MAX_ERROR_COUNT && !isFallbackMode) {
          const nextReconnectCount = reconnectCount + 1;
          setReconnectCount(nextReconnectCount);
          console.log(`[WebSocket] Reconnecting (attempt ${nextReconnectCount}/${reconnectAttempts})...`);
          
          // Устанавливаем таймаут для переподключения с экспоненциальной задержкой
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval * Math.pow(1.5, reconnectCount));
        }
      };
      
      // Улучшенный обработчик ошибок
      socket.onerror = (event) => {
        console.error('[WebSocket] Error:', event);
        
        // Увеличиваем счетчик ошибок
        handleWebSocketError();
        
        // Вызываем пользовательский обработчик, если он передан
        if (onError) onError(event);
      };
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
      handleWebSocketError();
      
      // Очищаем таймаут соединения при ошибке
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    }
  }, [
    isFallbackMode,
    onOpen,
    onMessage,
    onClose,
    onError,
    reconnectAttempts,
    reconnectInterval,
    autoReconnect,
    errorCount,
    reconnectCount,
    handleWebSocketError,
    disconnect,
    clearResources
  ]);
  
  /**
   * Отправка сообщения на сервер с улучшенной обработкой ошибок
   */
  const send = useCallback((message: any): boolean => {
    // В режиме fallback не отправляем сообщения
    if (isFallbackMode) {
      console.warn('[WebSocket] Cannot send message in fallback mode');
      return false;
    }
    
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        const serializedMessage = typeof message === 'string' 
          ? message 
          : JSON.stringify(message);
        
        socketRef.current.send(serializedMessage);
        return true;
      } catch (error) {
        console.error('[WebSocket] Error sending message:', error);
        handleWebSocketError();
        return false;
      }
    } else {
      console.warn('[WebSocket] Cannot send message: connection not open');
      return false;
    }
  }, [isFallbackMode, handleWebSocketError]);
  
  /**
   * Подписка на обновления для пользователя с указанным ID
   */
  const subscribeToUserUpdates = useCallback((userId: number): boolean => {
    return send({
      type: 'subscribe',
      userId
    });
  }, [send]);
  
  /**
   * Переключение между обычным и резервным режимом
   */
  const toggleFallbackMode = useCallback((enable: boolean) => {
    setIsFallbackMode(enable);
    
    if (enable) {
      disconnect();
    } else {
      setErrorCount(0);
      connect();
    }
  }, [connect, disconnect]);
  
  /**
   * Принудительная попытка переподключения (сбрасывает счетчики ошибок)
   */
  const forceReconnect = useCallback(() => {
    setErrorCount(0);
    setReconnectCount(0);
    setIsFallbackMode(false);
    disconnect();
    connect();
  }, [connect, disconnect]);
  
  // Инициализация соединения при монтировании компонента
  useEffect(() => {
    // Подключаемся, только если не в режиме fallback
    if (!isFallbackMode) {
      connect();
    }
    
    // Очищаем ресурсы при размонтировании компонента
    return () => {
      disconnect();
    };
  }, [connect, disconnect, isFallbackMode]);
  
  return {
    isConnected,
    lastMessage,
    send,
    subscribeToUserUpdates,
    connect,
    disconnect,
    reconnectCount,
    isFallbackMode,
    toggleFallbackMode,
    forceReconnect,
    errorCount
  };
};

export default useWebSocket;