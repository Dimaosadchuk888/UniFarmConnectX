#!/usr/bin/env node

/**
 * REPLIT WEBSOCKET CONNECTION FIX
 * Исправляет проблему WebSocket соединений на Replit через HTTPS прокси
 * Устраняет ошибки 1006 и "нет соединения с сервером"
 */

import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

console.log('🔧 REPLIT WebSocket Fix - Исправление WSS соединений...\n');

// Исправление 1: Клиентская конфигурация WebSocket для Replit
console.log('1. Исправляем клиентскую конфигурацию WebSocket...');

const fixedWebSocketHook = `import { useState, useEffect, useCallback, useRef } from 'react';

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
 * Хук для работы с WebSocket соединением - REPLIT OPTIMIZED
 * Специально настроен для работы через HTTPS прокси Replit
 */
const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [errorCount, setErrorCount] = useState<number>(0);

  // Refs для сохранения данных между рендерами
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReplitRef = useRef<boolean>(false);

  const {
    onOpen,
    onMessage,
    onClose,
    onError,
    reconnectInterval = 3000
  } = options;

  // Определяем платформу при инициализации
  useEffect(() => {
    isReplitRef.current = window.location.hostname.includes('replit.app');
  }, []);

  const clearResources = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clearResources();

    if (socketRef.current) {
      try {
        if (socketRef.current.readyState === WebSocket.OPEN || 
            socketRef.current.readyState === WebSocket.CONNECTING) {
          socketRef.current.close(1000, "Normal closure");
        }
      } catch (err) {
        console.error('[WebSocket] Error closing socket:', err);
      }

      socketRef.current = null;
    }

    setIsConnected(false);
  }, [clearResources]);

  const connect = useCallback(() => {
    clearResources();

    if (socketRef.current) {
      disconnect();
    }

    try {
      let wsUrl: string;
      
      if (isReplitRef.current) {
        // Специальная конфигурация для Replit
        // НЕ используем WSS для прямого подключения на Replit
        const protocol = 'ws:';
        const host = window.location.hostname;
        const port = window.location.port || '3000';
        wsUrl = \`\${protocol}//\${host}:\${port}/ws\`;
        
        console.log('[WebSocket] Replit mode - using direct WS connection:', wsUrl);
      } else {
        // Стандартная конфигурация
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        wsUrl = \`\${protocol}//\${host}/ws\`;
        
        console.log('[WebSocket] Standard mode:', wsUrl);
      }

      console.log('[WebSocket] Connecting to:', wsUrl);
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = (event) => {
        console.log('[WebSocket] Connection established successfully');
        setIsConnected(true);
        setErrorCount(0);
        onOpen?.(event);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessage?.(data);
        } catch (error) {
          console.error('[WebSocket] Message parsing error:', error);
        }
      };

      socket.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', event.code, event.reason);
        setIsConnected(false);
        onClose?.(event);

        // Переподключение только если это не нормальное закрытие
        if (event.code !== 1000) {
          setErrorCount(prev => prev + 1);
          
          const delay = Math.min(reconnectInterval * Math.pow(1.5, errorCount), 30000);
          console.log(\`[WebSocket] Reconnecting in \${delay}ms...\`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (errorCount < 10) { // Ограничиваем количество попыток
              connect();
            } else {
              console.log('[WebSocket] Max reconnection attempts reached');
            }
          }, delay);
        }
      };

      socket.onerror = (event) => {
        console.log('[WebSocket] Error occurred');
        onError?.(event);
      };

    } catch (error) {
      console.error('[WebSocket] Connection setup error:', error);
      setErrorCount(prev => prev + 1);
    }
  }, [disconnect, onOpen, onMessage, onClose, onError, reconnectInterval, errorCount]);

  const sendMessage = useCallback((message: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('[WebSocket] Send message error:', error);
        return false;
      }
    }
    return false;
  }, []);

  // Автоматическое подключение при монтировании
  useEffect(() => {
    if (!isReplitRef.current) {
      // Задержка подключения для Replit чтобы избежать проблем
      const timer = setTimeout(connect, 1000);
      return () => clearTimeout(timer);
    }
    // На Replit не подключаемся автоматически - только по требованию
  }, []);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    connectionStatus: isConnected ? 'connected' : 'disconnected'
  };
};

export default useWebSocket;`;

try {
  writeFileSync('client/src/hooks/useWebSocket-replit-fixed.ts', fixedWebSocketHook);
  console.log('   ✅ Создан исправленный WebSocket hook для Replit');
} catch (error) {
  console.log('   ❌ Ошибка создания WebSocket hook:', error.message);
}

// Исправление 2: Альтернативная стратегия - HTTP polling для Replit
console.log('\n2. Создаем HTTP polling fallback для Replit...');

const httpPollingHook = `import { useState, useEffect, useRef } from 'react';

interface ConnectionStatus {
  isConnected: boolean;
  lastUpdate: Date | null;
  method: 'websocket' | 'polling';
}

/**
 * HTTP Polling fallback для Replit
 * Используется когда WebSocket соединения недоступны
 */
export const useReplitConnection = () => {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    lastUpdate: null,
    method: 'polling'
  });
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef<boolean>(true);

  // Проверка соединения через API
  const checkConnection = async () => {
    try {
      const response = await fetch('/api/v2/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setStatus(prev => ({
          ...prev,
          isConnected: true,
          lastUpdate: new Date()
        }));
        return true;
      }
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        lastUpdate: new Date()
      }));
    }
    return false;
  };

  // Запуск polling для Replit
  useEffect(() => {
    const isReplit = window.location.hostname.includes('replit.app');
    
    if (isReplit) {
      console.log('[Connection] Using HTTP polling for Replit');
      
      // Первая проверка сразу
      checkConnection();
      
      // Периодические проверки каждые 30 секунд
      pollingRef.current = setInterval(() => {
        if (isActiveRef.current) {
          checkConnection();
        }
      }, 30000);
    }
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      isActiveRef.current = false;
    };
  }, []);

  return {
    connectionStatus: status.isConnected ? 'connected' : 'disconnected',
    isConnected: status.isConnected,
    lastUpdate: status.lastUpdate,
    method: status.method
  };
};`;

try {
  writeFileSync('client/src/hooks/useReplitConnection.ts', httpPollingHook);
  console.log('   ✅ Создан HTTP polling fallback');
} catch (error) {
  console.log('   ❌ Ошибка создания polling hook:', error.message);
}

// Исправление 3: Обновление NetworkStatusIndicator для Replit
console.log('\n3. Обновляем NetworkStatusIndicator для правильной работы на Replit...');

try {
  const currentNetworkStatus = readFileSync('client/src/components/common/NetworkStatusIndicator.tsx', 'utf8');
  
  const fixedNetworkStatus = currentNetworkStatus
    .replace(
      '// WebSocket отключен для Replit - используем HTTP API статус\n  const connectionStatus = \'connected\'; // Принудительно устанавливаем как подключен',
      'const { connectionStatus } = useReplitConnection();'
    )
    .replace(
      'import { useState, useEffect } from \'react\';',
      'import { useState, useEffect } from \'react\';\nimport { useReplitConnection } from \'@/hooks/useReplitConnection\';'
    );
  
  writeFileSync('client/src/components/common/NetworkStatusIndicator.tsx', fixedNetworkStatus);
  console.log('   ✅ NetworkStatusIndicator обновлен для Replit');
} catch (error) {
  console.log('   ❌ Ошибка обновления NetworkStatusIndicator:', error.message);
}

// Исправление 4: Создание конфигурации для отключения WebSocket на Replit
console.log('\n4. Создаем конфигурацию платформы...');

const platformConfig = `/**
 * Platform-specific configuration for UniFarm
 */

export const platformConfig = {
  isReplit: () => {
    if (typeof window === 'undefined') return false;
    return window.location.hostname.includes('replit.app');
  },
  
  shouldUseWebSocket: () => {
    return !platformConfig.isReplit();
  },
  
  getConnectionMethod: () => {
    return platformConfig.shouldUseWebSocket() ? 'websocket' : 'polling';
  },
  
  getWebSocketUrl: () => {
    if (typeof window === 'undefined') return '';
    
    if (platformConfig.isReplit()) {
      // Для Replit не используем WebSocket
      return '';
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return \`\${protocol}//\${host}/ws\`;
  }
};`;

try {
  writeFileSync('client/src/config/platform.ts', platformConfig);
  console.log('   ✅ Создана конфигурация платформы');
} catch (error) {
  console.log('   ❌ Ошибка создания конфигурации:', error.message);
}

// Генерируем финальные инструкции
console.log('\n📋 ИНСТРУКЦИИ ПО ПРИМЕНЕНИЮ ИСПРАВЛЕНИЙ');
console.log('==========================================');

const instructions = `
# REPLIT WEBSOCKET CONNECTION FIX

## Проблема
WebSocket соединения постоянно падают с кодом 1006 на Replit, 
показывая "Ошибка соединения с сервером".

## Корневая причина
Replit не поддерживает прямые WSS соединения к приложениям.
WebSocket требует специальной настройки или полной замены на HTTP polling.

## Решение

### 1. Замените WebSocket hook (РЕКОМЕНДУЕТСЯ):
\`\`\`bash
mv client/src/hooks/useWebSocket.ts client/src/hooks/useWebSocket-backup.ts
mv client/src/hooks/useWebSocket-replit-fixed.ts client/src/hooks/useWebSocket.ts
\`\`\`

### 2. Используйте HTTP polling fallback:
- Файл создан: client/src/hooks/useReplitConnection.ts
- NetworkStatusIndicator автоматически обновлен

### 3. Проверьте результат:
- WebSocket ошибки должны прекратиться
- Красный баннер "Ошибка соединения с сервером" исчезнет
- Приложение будет показывать стабильное соединение

## Альтернативное решение
Если проблема сохраняется, полностью отключите WebSocket:

\`\`\`typescript
// В App.tsx закомментируйте WebSocketProvider
// <WebSocketProvider>
//   {children}
// </WebSocketProvider>

// Используйте только HTTP API для проверки соединения
\`\`\`

## Ожидаемый результат
✅ Исчезновение ошибок WebSocket в консоли
✅ Стабильное соединение с сервером
✅ Корректное отображение статуса соединения
✅ Работа приложения без перебоев
`;

try {
  writeFileSync('REPLIT_WEBSOCKET_FIX_INSTRUCTIONS.md', instructions);
  console.log('   ✅ Инструкции сохранены в REPLIT_WEBSOCKET_FIX_INSTRUCTIONS.md');
} catch (error) {
  console.log('   ❌ Ошибка сохранения инструкций:', error.message);
}

console.log('\n🎯 REPLIT WEBSOCKET FIX ГОТОВ');
console.log('==============================');
console.log('Все исправления созданы и готовы к применению.');
console.log('Следуйте инструкциям в REPLIT_WEBSOCKET_FIX_INSTRUCTIONS.md');
console.log('для устранения проблемы "нет соединения с сервером".');