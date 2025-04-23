import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

/**
 * Компонент для диагностики работы API и WebSocket соединений
 * Проверяет доступность и работоспособность основных API эндпоинтов и WebSocket
 */

interface ApiStatus {
  endpoint: string;
  status: 'success' | 'error' | 'pending';
  responseTime?: number;
  data?: any;
  error?: string;
}

interface WebSocketStatus {
  connected: boolean;
  reconnectAttempts: number;
  lastMessageTime?: string;
  receivedMessages: number;
  sentMessages: number;
  errors: string[];
}

interface ApiAuditData {
  apiTests: ApiStatus[];
  webSocketStatus: WebSocketStatus;
  headersDiagnostics: {
    telegramDataPresent: boolean;
    telegramUserIdPresent: boolean;
    developmentModeEnabled: boolean;
    authHeadersCount: number;
  };
  time: string;
}

const ApiAndWebSocketDiagnostics: React.FC = () => {
  const [diagnosticData, setDiagnosticData] = useState<ApiAuditData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webSocketLog, setWebSocketLog] = useState<{message: string; timestamp: string}[]>([]);

  useEffect(() => {
    // Создаем мониторинг WebSocket
    const wsLog: {message: string; timestamp: string}[] = [];
    const logWSMessage = (message: string) => {
      const newLog = {
        message,
        timestamp: new Date().toISOString()
      };
      wsLog.push(newLog);
      setWebSocketLog(prev => [...prev, newLog]);
    };

    // Мониторинг WebSocket соединения
    let wsStatus: WebSocketStatus = {
      connected: false,
      reconnectAttempts: 0,
      receivedMessages: 0,
      sentMessages: 0,
      errors: []
    };

    // Создаем WebSocket соединение для теста
    logWSMessage('Инициализация WebSocket соединения...');
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      wsStatus.connected = true;
      logWSMessage(`WebSocket соединение установлено с ${wsUrl}`);
      
      // Отправляем тестовое сообщение
      try {
        socket.send(JSON.stringify({ type: 'subscribe', userId: 1 }));
        wsStatus.sentMessages++;
        logWSMessage('Отправлено сообщение подписки на обновления');
      } catch (err) {
        wsStatus.errors.push(`Ошибка отправки сообщения: ${err}`);
        logWSMessage(`Ошибка отправки сообщения: ${err}`);
      }
    };
    
    socket.onmessage = (event) => {
      wsStatus.receivedMessages++;
      wsStatus.lastMessageTime = new Date().toISOString();
      logWSMessage(`Получено сообщение от сервера: ${event.data}`);
    };
    
    socket.onerror = (event) => {
      wsStatus.errors.push(`WebSocket ошибка: ${JSON.stringify(event)}`);
      logWSMessage(`WebSocket ошибка: ${JSON.stringify(event)}`);
    };
    
    socket.onclose = (event) => {
      wsStatus.connected = false;
      logWSMessage(`WebSocket соединение закрыто: код ${event.code}, причина: ${event.reason || 'не указана'}`);
      
      if (event.code !== 1000) {
        wsStatus.reconnectAttempts++;
        logWSMessage(`Попытка переподключения #${wsStatus.reconnectAttempts}`);
      }
    };

    // Тестируем API эндпоинты
    const runApiTests = async () => {
      try {
        const apiTests: ApiStatus[] = [];
        
        // Список эндпоинтов для тестирования
        const endpoints = [
          '/api/me',
          '/api/wallet/balance',
          '/api/daily-bonus/status',
          '/api/ton-farming/info',
          '/api/uni-farming/info',
          '/api/referral/stats',
          '/api/boosts/active'
        ];
        
        // Инициализируем начальные состояния
        endpoints.forEach(endpoint => {
          apiTests.push({
            endpoint,
            status: 'pending'
          });
        });
        
        // Обновляем состояние с начальными данными
        setDiagnosticData({
          apiTests,
          webSocketStatus: wsStatus,
          headersDiagnostics: {
            telegramDataPresent: false,
            telegramUserIdPresent: false,
            developmentModeEnabled: false,
            authHeadersCount: 0
          },
          time: new Date().toISOString()
        });
        
        // Выполняем запросы и обновляем состояние по мере получения ответов
        await Promise.all(endpoints.map(async (endpoint, index) => {
          const startTime = performance.now();
          try {
            // Добавляем user_id=1 для работы в режиме разработки
            const fullEndpoint = `${endpoint}${endpoint.includes('?') ? '&' : '?'}user_id=1`;
            const response = await apiRequest(fullEndpoint);
            
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);
            
            apiTests[index] = {
              endpoint,
              status: response.success ? 'success' : 'error',
              responseTime,
              data: response.success ? response.data : null,
              error: response.success ? undefined : response.message
            };
            
            // Обновляем состояние после каждого запроса
            setDiagnosticData(prev => ({
              ...prev!,
              apiTests: [...apiTests],
              time: new Date().toISOString()
            }));
            
            console.log(`[АУДИТ] [API] Тест ${endpoint}: ${response.success ? 'успешно' : 'ошибка'} (${responseTime}ms)`);
          } catch (err) {
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);
            
            apiTests[index] = {
              endpoint,
              status: 'error',
              responseTime,
              error: `${err}`
            };
            
            // Обновляем состояние после каждого запроса
            setDiagnosticData(prev => ({
              ...prev!,
              apiTests: [...apiTests],
              time: new Date().toISOString()
            }));
            
            console.error(`[АУДИТ] [API] Ошибка теста ${endpoint}:`, err);
          }
        }));
        
        // Анализируем заголовки, которые отправляются с запросами
        const headers = await apiRequest('/api/telegram-debug');
        
        const headersDiagnostics = {
          telegramDataPresent: headers.data?.telegramSpecificHeaders?.telegramData !== undefined,
          telegramUserIdPresent: headers.data?.telegramSpecificHeaders?.telegramUserId !== undefined,
          developmentModeEnabled: headers.data?.environment === 'development',
          authHeadersCount: Object.keys(headers.data?.telegramSpecificHeaders || {}).length
        };
        
        // Финальное обновление с полными данными
        setDiagnosticData(prev => ({
          ...prev!,
          webSocketStatus: wsStatus,
          headersDiagnostics,
          time: new Date().toISOString()
        }));
        
        console.log('[АУДИТ] [API] Диагностика API и заголовков завершена:', headersDiagnostics);
      } catch (err) {
        setError(`Ошибка при выполнении API тестов: ${err}`);
        console.error('[АУДИТ] [API] Ошибка диагностики:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Запускаем тесты API после небольшой задержки, чтобы WebSocket успел установить соединение
    setTimeout(runApiTests, 1000);
    
    // Очистка при размонтировании
    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        logWSMessage('Закрытие WebSocket соединения при размонтировании компонента');
        socket.close();
      }
    };
  }, []);
  
  if (isLoading && !diagnosticData) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
        <span>Выполняется диагностика API и WebSocket...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-md">
        <h3 className="text-red-700 font-medium">Ошибка диагностики</h3>
        <p className="text-red-600 mt-1">{error}</p>
      </div>
    );
  }
  
  if (!diagnosticData) {
    return <div>Нет данных для отображения</div>;
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md mb-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Диагностика API и WebSocket</h2>
      
      {/* WebSocket статус */}
      <div className="mb-6">
        <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">Статус WebSocket</h3>
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Соединение:</div>
            <div className={`text-sm ${diagnosticData.webSocketStatus.connected ? 'text-green-600' : 'text-red-600'}`}>
              {diagnosticData.webSocketStatus.connected ? 'Установлено' : 'Отключено'}
            </div>
            
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Попытки переподключения:</div>
            <div className="text-sm">{diagnosticData.webSocketStatus.reconnectAttempts}</div>
            
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Полученные сообщения:</div>
            <div className="text-sm">{diagnosticData.webSocketStatus.receivedMessages}</div>
            
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Отправленные сообщения:</div>
            <div className="text-sm">{diagnosticData.webSocketStatus.sentMessages}</div>
            
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Последнее сообщение:</div>
            <div className="text-sm">{diagnosticData.webSocketStatus.lastMessageTime || 'Нет сообщений'}</div>
          </div>
          
          {diagnosticData.webSocketStatus.errors.length > 0 && (
            <div className="mt-2">
              <div className="text-sm font-medium text-red-600 dark:text-red-400">Ошибки WebSocket:</div>
              <ul className="list-disc list-inside text-xs text-red-600 dark:text-red-400 mt-1">
                {diagnosticData.webSocketStatus.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      
      {/* Диагностика заголовков */}
      <div className="mb-6">
        <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">Диагностика заголовков запросов</h3>
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Telegram initData в заголовках:</div>
            <div className={`text-sm ${diagnosticData.headersDiagnostics.telegramDataPresent ? 'text-green-600' : 'text-yellow-600'}`}>
              {diagnosticData.headersDiagnostics.telegramDataPresent ? 'Присутствует' : 'Отсутствует'}
            </div>
            
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Telegram User ID в заголовках:</div>
            <div className={`text-sm ${diagnosticData.headersDiagnostics.telegramUserIdPresent ? 'text-green-600' : 'text-yellow-600'}`}>
              {diagnosticData.headersDiagnostics.telegramUserIdPresent ? 'Присутствует' : 'Отсутствует'}
            </div>
            
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Режим разработки:</div>
            <div className={`text-sm ${diagnosticData.headersDiagnostics.developmentModeEnabled ? 'text-green-600' : 'text-yellow-600'}`}>
              {diagnosticData.headersDiagnostics.developmentModeEnabled ? 'Активен' : 'Неактивен'}
            </div>
            
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Количество авторизационных заголовков:</div>
            <div className="text-sm">{diagnosticData.headersDiagnostics.authHeadersCount}</div>
          </div>
        </div>
      </div>
      
      {/* Результаты API тестов */}
      <div className="mb-6">
        <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">Результаты тестирования API</h3>
        <div className="space-y-2">
          {diagnosticData.apiTests.map((test, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {test.endpoint}
                </div>
                <div className="flex items-center">
                  {test.status === 'pending' && (
                    <span className="flex items-center text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                      <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full mr-1"></div>
                      В процессе
                    </span>
                  )}
                  {test.status === 'success' && (
                    <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                      Успешно ({test.responseTime}ms)
                    </span>
                  )}
                  {test.status === 'error' && (
                    <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                      Ошибка ({test.responseTime}ms)
                    </span>
                  )}
                </div>
              </div>
              
              {test.error && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Ошибка: {test.error}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* WebSocket лог */}
      <div className="mb-4">
        <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-200">Лог WebSocket</h3>
        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-md">
          <div className="max-h-40 overflow-y-auto">
            {webSocketLog.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 p-2">Нет записей</div>
            ) : (
              webSocketLog.map((log, index) => (
                <div key={index} className="text-xs border-b border-gray-200 dark:border-gray-600 py-1">
                  <span className="text-gray-500 dark:text-gray-400 mr-2">
                    {new Date(log.timestamp).toLocaleTimeString()}:
                  </span>
                  <span>{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 text-right mt-2">
        Диагностика обновлена: {new Date(diagnosticData.time).toLocaleString()}
      </div>
    </div>
  );
};

export default ApiAndWebSocketDiagnostics;