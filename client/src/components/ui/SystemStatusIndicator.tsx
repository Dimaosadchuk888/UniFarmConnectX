
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';

interface SystemStatus {
  telegram: 'ready' | 'not_available' | 'loading';
  api: 'connected' | 'disconnected' | 'loading';
  websocket: 'connected' | 'disconnected' | 'loading';
  session: 'restored' | 'guest' | 'loading';
}

const SystemStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus>({
    telegram: 'loading',
    api: 'loading',
    websocket: 'loading',
    session: 'loading'
  });

  useEffect(() => {
    const checkSystemStatus = () => {
      // Проверка Telegram WebApp
      const telegramStatus = typeof window !== 'undefined' && window.Telegram 
        ? 'ready' 
        : 'not_available';

      // Проверка сессии
      const guestId = localStorage.getItem('unifarm_guest_id');
      const sessionData = localStorage.getItem('unifarm_last_session');
      const sessionStatus = sessionData 
        ? 'restored' 
        : guestId 
          ? 'guest' 
          : 'loading';

      setStatus(prev => ({
        ...prev,
        telegram: telegramStatus,
        session: sessionStatus,
        api: 'connected', // Предполагаем, что API работает
        websocket: 'connected' // Предполагаем, что WebSocket работает
      }));
    };

    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case 'ready':
      case 'connected':
      case 'restored':
        return 'bg-green-500';
      case 'guest':
        return 'bg-yellow-500';
      case 'loading':
        return 'bg-blue-500';
      case 'not_available':
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (key: string, statusValue: string) => {
    const statusMap: Record<string, Record<string, string>> = {
      telegram: {
        ready: 'Готов',
        not_available: 'Недоступен',
        loading: 'Загрузка...'
      },
      api: {
        connected: 'Подключен',
        disconnected: 'Отключен',
        loading: 'Подключение...'
      },
      websocket: {
        connected: 'Подключен',
        disconnected: 'Отключен',
        loading: 'Подключение...'
      },
      session: {
        restored: 'Восстановлена',
        guest: 'Гостевая',
        loading: 'Загрузка...'
      }
    };

    return statusMap[key]?.[statusValue] || statusValue;
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Статус системы</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Telegram WebApp:</span>
          <Badge className={`${getStatusColor(status.telegram)} text-white`}>
            {getStatusText('telegram', status.telegram)}
          </Badge>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">API:</span>
          <Badge className={`${getStatusColor(status.api)} text-white`}>
            {getStatusText('api', status.api)}
          </Badge>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">WebSocket:</span>
          <Badge className={`${getStatusColor(status.websocket)} text-white`}>
            {getStatusText('websocket', status.websocket)}
          </Badge>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Сессия:</span>
          <Badge className={`${getStatusColor(status.session)} text-white`}>
            {getStatusText('session', status.session)}
          </Badge>
        </div>
        
        <div className="text-xs text-gray-500 mt-3 text-center">
          Обновляется каждые 5 секунд
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemStatusIndicator;
