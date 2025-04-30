import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Notification as NotificationType } from '@/types/notification';

interface NotificationProps {
  notification: NotificationType;
  onDismiss: (id: string) => void;
}

export const Notification: React.FC<NotificationProps> = ({ 
  notification, 
  onDismiss 
}) => {
  const [isExiting, setIsExiting] = useState(false);

  // Настройка автоматического скрытия уведомления, если задана длительность
  useEffect(() => {
    if (notification.autoDismiss && notification.duration) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        const animationTimer = setTimeout(() => {
          onDismiss(notification.id);
        }, 300); // длительность анимации исчезновения
        
        return () => clearTimeout(animationTimer);
      }, notification.duration);
      
      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss]);

  // Обработчик закрытия уведомления
  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300);
  };

  // Определение иконки в зависимости от типа уведомления
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'loading':
        return <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />;
      default:
        return null;
    }
  };

  // Определение цвета фона в зависимости от типа уведомления
  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'loading':
        return 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800';
      default:
        return 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800';
    }
  };

  return (
    <div
      className={cn(
        'relative flex items-center justify-between p-4 rounded-lg border shadow-sm mb-3 max-w-md w-full transform transition-all duration-300 ease-in-out',
        getBackgroundColor(),
        isExiting ? 'opacity-0 translate-x-3' : 'opacity-100 translate-x-0'
      )}
    >
      <div className="flex items-center space-x-3">
        {getIcon()}
        <p className="text-sm text-foreground">{notification.message}</p>
      </div>
      
      <button
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground rounded-full p-1 transition-colors"
        aria-label="Закрыть уведомление"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Notification;