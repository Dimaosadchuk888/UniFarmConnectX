import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useWebSocket } from '@/contexts/webSocketContext';
import { 
  Alert,
  AlertTitle,
  AlertDescription
} from '@/components/ui/alert';
import { WifiIcon, WifiOffIcon, ServerIcon, ServerOffIcon } from 'lucide-react';

type AlertType = 'online' | 'offline' | 'wsConnected' | 'wsDisconnected' | 'hidden';

/**
 * Компонент для отображения статуса сетевого соединения и WebSocket
 * ПОЛНОСТЬЮ ОТКЛЮЧЕН - НЕ ПОКАЗЫВАЕТ НИКАКИХ УВЕДОМЛЕНИЙ ПОЛЬЗОВАТЕЛЯМ
 */
const NetworkStatusIndicator: React.FC = () => {
  // ПОЛНОСТЬЮ ОТКЛЮЧАЕМ ВСЕ СИСТЕМНЫЕ УВЕДОМЛЕНИЯ
  // Компонент больше не показывает никаких уведомлений об ошибках
  return null;

  const alertContent = {
    online: {
      icon: <WifiIcon className="h-4 w-4 text-green-600" />,
      title: "Соединение восстановлено",
      description: "Интернет-соединение успешно восстановлено.",
      variant: "default" as const
    },
    offline: {
      icon: <WifiOffIcon className="h-4 w-4 text-red-600" />,
      title: "Нет интернет-соединения",
      description: "Проверьте ваше подключение к интернету.",
      variant: "destructive" as const
    },
    wsConnected: {
      icon: <ServerIcon className="h-4 w-4 text-green-600" />,
      title: "Соединение с сервером установлено",
      description: "Данные обновляются в реальном времени.",
      variant: "default" as const
    },
    wsDisconnected: {
      icon: <ServerOffIcon className="h-4 w-4 text-red-600" />,
      title: "Ошибка соединения с сервером",
      description: "Попытка переподключения...",
      variant: "destructive" as const
    },
    hidden: {
      icon: null,
      title: "",
      description: "",
      variant: "default" as const
    }
  };

  const { icon, title, description, variant } = alertContent[alertType];

  return (
    <div className="fixed top-16 left-0 right-0 z-50 mx-auto w-full max-w-md px-4">
      <Alert 
        variant={variant === 'default' ? 'default' : 'destructive'}
        className={cn(
          "border shadow-lg transition-opacity duration-300",
          alertType === 'online' || alertType === 'wsConnected' ? 'bg-green-50 dark:bg-green-950' : '',
          alertType === 'offline' || alertType === 'wsDisconnected' ? 'bg-red-50 dark:bg-red-950' : ''
        )}
      >
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{description}</AlertDescription>
          </div>
        </div>
      </Alert>
    </div>
  );
};

export default NetworkStatusIndicator;