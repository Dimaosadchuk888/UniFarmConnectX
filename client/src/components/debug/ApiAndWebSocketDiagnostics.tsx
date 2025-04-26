import React, { useState, useEffect } from 'react';

/**
 * Компонент для диагностики API и WebSocket соединений
 * Проверяет доступность основных эндпоинтов API и активность WebSocket
 */

interface ApiTestResult {
  endpoint: string;
  status: 'success' | 'error' | 'pending';
  responseTime?: number;
  statusCode?: number;
  data?: any;
  error?: string;
}

interface WebSocketStatus {
  connected: boolean;
  lastPing?: string;
  responseTime?: number;
  reconnectCount: number;
  error?: string;
}

interface ApiAndWebSocketDiagnosticsData {
  apiTests: ApiTestResult[];
  webSocket: WebSocketStatus;
  time: string;
}

const ApiAndWebSocketDiagnostics: React.FC = () => {
  const [diagnosticData, setDiagnosticData] = useState<ApiAndWebSocketDiagnosticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        // Начальное состояние для отображения процесса загрузки
        const initialData: ApiAndWebSocketDiagnosticsData = {
          apiTests: [
            { endpoint: '/api/me', status: 'pending' },
            { endpoint: '/api/uni-farming/info', status: 'pending' },
            { endpoint: '/api/ton-farming/info', status: 'pending' },
            { endpoint: '/api/boosts/active', status: 'pending' },
            { endpoint: '/api/referral/code', status: 'pending' },
            { endpoint: '/api/referral/stats', status: 'pending' }
          ],
          webSocket: {
            connected: false,
            reconnectCount: 0
          },
          time: new Date().toISOString()
        };
        
        setDiagnosticData(initialData);
        
        // Тестируем API эндпоинты
        const apiResults = await Promise.all(
          initialData.apiTests.map(async (test) => {
            try {
              const startTime = performance.now();
              // Добавляем временную метку и ID пользователя для обхода кеша
              const response = await fetch(`${test.endpoint}?user_id=1&nocache=${Date.now()}`, {
                headers: {
                  'Content-Type': 'application/json',
                  'x-development-mode': 'true',
                  'x-development-user-id': '1',
                  'x-telegram-user-id': '1'
                }
              });
              const endTime = performance.now();
              
              let data;
              try {
                data = await response.json();
              } catch (e) {
                data = { error: 'JSON parse error' };
              }
              
              console.log('[АУДИТ] [API] Тест эндпоинта:', test.endpoint, 'Результат:', data);
              
              return {
                ...test,
                status: response.ok ? 'success' : 'error',
                responseTime: Math.round(endTime - startTime),
                statusCode: response.status,
                data
              };
            } catch (err) {
              console.error('[АУДИТ] [API] Ошибка теста', test.endpoint, ':', err);
              return {
                ...test,
                status: 'error',
                error: err instanceof Error ? err.message : String(err)
              };
            }
          })
        );
        
        // Тестируем WebSocket
        let webSocketStatus: WebSocketStatus = {
          connected: false,
          reconnectCount: 0,
          error: 'WebSocket тест не выполнен'
        };
        
        try {
          const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
          const wsUrl = `${protocol}//${window.location.host}/ws`;
          
          const ws = new WebSocket(wsUrl);
          
          await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error('WebSocket connection timeout'));
            }, 5000);
            
            ws.onopen = () => {
              webSocketStatus.connected = true;
              
              // Отправляем ping для теста
              const startTime = performance.now();
              ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
              
              // Ожидаем ответ
              ws.onmessage = (event) => {
                try {
                  const data = JSON.parse(event.data);
                  if (data.type === 'pong') {
                    const endTime = performance.now();
                    webSocketStatus.lastPing = data.timestamp;
                    webSocketStatus.responseTime = Math.round(endTime - startTime);
                    clearTimeout(timeoutId);
                    setTimeout(() => {
                      ws.close();
                      resolve(null);
                    }, 500);
                  }
                } catch (e) {
                  webSocketStatus.error = 'Error parsing WebSocket message';
                }
              };
            };
            
            ws.onerror = (event) => {
              webSocketStatus.error = 'WebSocket connection error';
              clearTimeout(timeoutId);
              reject(new Error('WebSocket connection error'));
            };
          });
        } catch (wsErr) {
          webSocketStatus.error = wsErr instanceof Error ? wsErr.message : String(wsErr);
          console.error('[АУДИТ] [WebSocket] Ошибка теста WebSocket:', wsErr);
        }
        
        // Обновляем состояние с результатами диагностики
        const finalData: ApiAndWebSocketDiagnosticsData = {
          apiTests: apiResults as ApiTestResult[],
          webSocket: webSocketStatus,
          time: new Date().toISOString()
        };
        
        setDiagnosticData(finalData);
        console.log('[АУДИТ] [API/WS] Диагностика API и WebSocket выполнена:', finalData);
      } catch (err) {
        setError(`Ошибка при выполнении диагностики: ${err}`);
        console.error('[АУДИТ] [API/WS] Ошибка диагностики:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    runDiagnostics();
  }, []);
  
  if (isLoading && !diagnosticData) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
        <span>Инициализация диагностики API и WebSocket...</span>
      </div>
    );
  }
  
  if (error && !diagnosticData) {
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
    <div className="space-y-6">
      {/* Общий статус */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col items-center justify-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
            diagnosticData.apiTests.every(t => t.status === 'success') 
              ? 'bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-200' 
              : diagnosticData.apiTests.some(t => t.status === 'success')
                ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-800 dark:text-yellow-200'
                : 'bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-200'
          }`}>
            {diagnosticData.apiTests.every(t => t.status === 'success') ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">API Тесты</div>
          <div className="text-xl font-bold text-gray-800 dark:text-white mt-1">{diagnosticData.apiTests.filter(t => t.status === 'success').length}/{diagnosticData.apiTests.length}</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col items-center justify-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
            diagnosticData.webSocket.connected 
              ? 'bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-200' 
              : 'bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-200'
          }`}>
            {diagnosticData.webSocket.connected ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 3.636a1 1 0 010 1.414 7 7 0 000 9.9 1 1 0 11-1.414 1.414 9 9 0 010-12.728 1 1 0 011.414 0zm9.9 0a1 1 0 011.414 0 9 9 0 010 12.728 1 1 0 11-1.414-1.414 7 7 0 000-9.9 1 1 0 010-1.414zM7.879 6.464a1 1 0 010 1.414 3 3 0 000 4.243 1 1 0 11-1.415 1.414 5 5 0 010-7.07 1 1 0 011.415 0zm4.242 0a1 1 0 011.415 0 5 5 0 010 7.072 1 1 0 01-1.415-1.415 3 3 0 000-4.242 1 1 0 010-1.415z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
              </svg>
            )}
          </div>
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">WebSocket</div>
          <div className={`text-xl font-bold ${diagnosticData.webSocket.connected ? 'text-green-600' : 'text-red-600'} mt-1`}>
            {diagnosticData.webSocket.connected ? 'Активен' : 'Недоступен'}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col items-center justify-center">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Среднее время ответа</div>
          <div className="text-xl font-bold text-gray-800 dark:text-white mt-1">
            {diagnosticData.apiTests
              .filter(t => t.responseTime != null)
              .reduce((sum, curr) => sum + (curr.responseTime || 0), 0) / 
              diagnosticData.apiTests.filter(t => t.responseTime != null).length || 0
            }ms
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col items-center justify-center">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-300">WebSocket ping</div>
          <div className="text-xl font-bold text-gray-800 dark:text-white mt-1">
            {diagnosticData.webSocket.responseTime ? `${diagnosticData.webSocket.responseTime}ms` : 'N/A'}
          </div>
        </div>
      </div>
      
      {/* API Tests */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Тесты API эндпоинтов</h3>
        
        <div className="space-y-2">
          {diagnosticData.apiTests.map((test, index) => (
            <div key={index} className="border border-gray-100 dark:border-gray-700 rounded-md overflow-hidden">
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  test.status === 'success' ? 'bg-green-500' : 
                  test.status === 'pending' ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`}></div>
                <div className="flex-1 font-medium">{test.endpoint}</div>
                <div className={`text-xs px-2 py-1 rounded ${
                  test.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 
                  test.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' : 
                  'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                }`}>
                  {test.status === 'success' ? `OK (${test.statusCode})` : 
                   test.status === 'pending' ? 'Ожидание' : 
                   `Ошибка (${test.statusCode || 'N/A'})`}
                </div>
                {test.responseTime && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    {test.responseTime}ms
                  </div>
                )}
              </div>
              
              {test.status === 'error' && test.error && (
                <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                  {test.error}
                </div>
              )}
              
              {test.status === 'success' && test.data && (
                <div className="p-3 text-sm">
                  <div className="font-medium mb-1 text-gray-700 dark:text-gray-300">Ответ:</div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                    <code className="text-xs overflow-auto block max-h-20">
                      {JSON.stringify(test.data, null, 2)}
                    </code>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* WebSocket Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Статус WebSocket соединения</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Статус</div>
              <div className={`mt-1 font-medium ${diagnosticData.webSocket.connected ? 'text-green-600' : 'text-red-600'}`}>
                {diagnosticData.webSocket.connected ? 'Подключено' : 'Не подключено'}
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Время отклика</div>
              <div className="mt-1 font-medium text-gray-800 dark:text-white">
                {diagnosticData.webSocket.responseTime ? `${diagnosticData.webSocket.responseTime}ms` : 'N/A'}
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Переподключения</div>
              <div className="mt-1 font-medium text-gray-800 dark:text-white">
                {diagnosticData.webSocket.reconnectCount}
              </div>
            </div>
          </div>
          
          {diagnosticData.webSocket.error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 p-3 rounded-md">
              <div className="text-sm font-medium text-red-700 dark:text-red-300">Ошибка WebSocket:</div>
              <div className="mt-1 text-sm text-red-600 dark:text-red-400">
                {diagnosticData.webSocket.error}
              </div>
            </div>
          )}
          
          {diagnosticData.webSocket.connected && diagnosticData.webSocket.lastPing && (
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Последний ping-pong:</div>
              <div className="mt-1 text-sm text-gray-800 dark:text-white">
                {new Date(diagnosticData.webSocket.lastPing).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 text-right mt-2">
        Диагностика выполнена: {new Date(diagnosticData.time).toLocaleString()}
      </div>
      
      {isLoading && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md">
            <div className="flex items-center mb-4">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-3"></div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Тестирование API и WebSocket</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Выполняется тестирование {diagnosticData.apiTests.filter(t => t.status === 'success').length}/{diagnosticData.apiTests.length} эндпоинтов...
            </p>
            {diagnosticData.webSocket.connected ? (
              <p className="text-green-600 mt-2">WebSocket подключен ✓</p>
            ) : (
              <p className="text-yellow-600 mt-2">Проверка WebSocket...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiAndWebSocketDiagnostics;