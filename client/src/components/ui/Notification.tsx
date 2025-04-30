import React, { useEffect } from 'react';
import { Notification as NotificationType } from '@/types/notification';

interface NotificationProps {
  notification: NotificationType;
  onDismiss: (id: string) => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onDismiss }) => {
  const { id, type, message, duration, autoDismiss } = notification;
  
  // Автоматически скрываем уведомление через duration, если autoDismiss = true
  useEffect(() => {
    if (autoDismiss && duration) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [id, duration, autoDismiss, onDismiss]);
  
  // Выбираем цвет фона и иконку в зависимости от типа уведомления
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bgClass: 'bg-success/10 border border-success/30',
          textClass: 'text-success',
          icon: 'fas fa-check-circle'
        };
      case 'error':
        return {
          bgClass: 'bg-destructive/10 border border-destructive/30',
          textClass: 'text-destructive',
          icon: 'fas fa-exclamation-circle'
        };
      case 'info':
        return {
          bgClass: 'bg-primary/10 border border-primary/30',
          textClass: 'text-primary',
          icon: 'fas fa-info-circle'
        };
      case 'loading':
        return {
          bgClass: 'bg-muted/10 border border-muted/30',
          textClass: 'text-muted-foreground',
          icon: 'fas fa-spinner fa-spin'
        };
      default:
        return {
          bgClass: 'bg-muted/10 border border-muted/30',
          textClass: 'text-muted-foreground',
          icon: 'fas fa-bell'
        };
    }
  };
  
  const styles = getTypeStyles();
  
  return (
    <div 
      className={`rounded-lg shadow-lg backdrop-blur-sm px-4 py-3 ${styles.bgClass} min-w-[300px] max-w-sm mb-2 animate-slideInRight`}
      role="alert"
    >
      <div className="flex items-start">
        <div className={`mr-3 ${styles.textClass}`}>
          <i className={styles.icon}></i>
        </div>
        <div className="flex-1 text-sm">
          <p className="text-foreground font-medium">{message}</p>
        </div>
        <button 
          onClick={() => onDismiss(id)} 
          className="ml-2 text-gray-400 hover:text-gray-500 transition-colors"
          aria-label="Закрыть"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
};

export default Notification;