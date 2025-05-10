import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useWebSocket } from '@/contexts/webSocketContext';
import { toast } from '@/hooks/use-toast';

/**
 * Компонент для отображения статуса сетевого подключения и WebSocket соединения
 * Автоматически отображает предупреждения при проблемах с соединением
 */
const NetworkStatusIndicator: React.FC = () => {
  // Состояния для отслеживания разных типов соединений
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [hasInternetAccess, setHasInternetAccess] = useState<boolean>(true);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);
  
  // Получаем информацию о состоянии WebSocket из контекста
  const { isConnected: isWebSocketConnected } = useWebSocket();
  
  // Обработчики для событий онлайн/оффлайн
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkInternetAccess();
      toast({
        title: 'Соединение восстановлено',
        description: 'Сетевое подключение восстановлено',
        variant: 'success',
        duration: 3000,
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setHasInternetAccess(false);
      toast({
        title: 'Нет соединения',
        description: 'Отсутствует сетевое подключение',
        variant: 'destructive',
        duration: 5000,
      });
    };
    
    // Проверка интернет-соединения при загрузке компонента
    checkInternetAccess();
    
    // Устанавливаем обработчики
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Периодическая проверка интернет-соединения
    const checkInterval = setInterval(checkInternetAccess, 30000); // каждые 30 секунд
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(checkInterval);
    };
  }, []);
  
  // Мониторинг состояния WebSocket
  useEffect(() => {
    // Показываем уведомление только когда статус меняется с connected на disconnected
    if (!isWebSocketConnected) {
      toast({
        title: 'WebSocket отключен',
        description: 'Соединение с сервером потеряно, обновления в реальном времени недоступны',
        variant: 'destructive',
        duration: 5000,
      });
    }
  }, [isWebSocketConnected]);
  
  // Функция для проверки наличия реального доступа к интернету
  const checkInternetAccess = async () => {
    if (!navigator.onLine) {
      setHasInternetAccess(false);
      return;
    }
    
    setCheckingStatus(true);
    
    try {
      // Отправляем запрос на надежный эндпоинт (с добавлением метки времени для предотвращения кэширования)
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/health?timestamp=${timestamp}`, {
        method: 'HEAD',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      // Проверяем, что запрос прошел успешно
      const newStatus = response.ok;
      
      // Обновляем статус только если он изменился
      if (newStatus !== hasInternetAccess) {
        setHasInternetAccess(newStatus);
        
        // Если подключение только что восстановилось, показываем уведомление
        if (newStatus) {
          toast({
            title: 'Соединение с сервером восстановлено',
            description: 'Приложение снова на связи',
            variant: 'success',
            duration: 3000,
          });
        }
      }
    } catch (error) {
      // Если произошла ошибка, считаем что интернета нет
      if (hasInternetAccess) {
        setHasInternetAccess(false);
        
        toast({
          title: 'Проблемы с подключением',
          description: 'Не удается соединиться с сервером',
          variant: 'destructive',
          duration: 5000,
        });
      }
    } finally {
      setCheckingStatus(false);
    }
  };
  
  // Определяем статус для отображения
  let status: 'online' | 'limited' | 'offline' = 'offline';
  
  if (isOnline && hasInternetAccess && isWebSocketConnected) {
    status = 'online';
  } else if (isOnline && hasInternetAccess) {
    status = 'limited';
  } else {
    status = 'offline';
  }
  
  // Определяем цвета и иконки в зависимости от статуса
  const statusConfig = {
    online: {
      icon: <Wifi className="h-4 w-4" />,
      textColor: 'text-green-400',
      bgColor: 'bg-green-400/10',
      borderColor: 'border-green-400/20',
      text: 'Соединение стабильно'
    },
    limited: {
      icon: <AlertTriangle className="h-4 w-4" />,
      textColor: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      borderColor: 'border-yellow-400/20',
      text: 'Ограниченное соединение'
    },
    offline: {
      icon: <WifiOff className="h-4 w-4" />,
      textColor: 'text-red-400',
      bgColor: 'bg-red-400/10',
      borderColor: 'border-red-400/20',
      text: 'Нет соединения'
    }
  };
  
  const config = statusConfig[status];
  
  return (
    <div 
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full ${config.bgColor} ${config.borderColor} border shadow-lg transition-all duration-300 ${config.textColor}`}
      onClick={checkInternetAccess}
    >
      <div className={`animate-pulse ${checkingStatus ? 'opacity-100' : 'opacity-0'}`}>
        {config.icon}
      </div>
      <div className={`${checkingStatus ? 'opacity-0' : 'opacity-100'}`}>
        {config.icon}
      </div>
      <span className="text-xs font-medium">{config.text}</span>
    </div>
  );
};

export default NetworkStatusIndicator;