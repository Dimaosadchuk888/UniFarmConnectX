import React, { createContext, useContext, useState, useCallback } from 'react';
import { Notification, NotificationOptions } from '@/../types/notification';

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (options: NotificationOptions) => string;
  removeNotification: (id: string) => void;
  success: (message: string, options?: Partial<NotificationOptions>) => string;
  error: (message: string, options?: Partial<NotificationOptions>) => string;
  info: (message: string, options?: Partial<NotificationOptions>) => string;
  loading: (message: string, options?: Partial<NotificationOptions>) => string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((options: NotificationOptions): string => {
    const id = Math.random().toString(36).substring(2);
    const notification: Notification = {
      id,
      type: 'info',
      duration: 5000,
      autoDismiss: true,
      ...options,
    };

    setNotifications(prev => [...prev, notification]);

    // Автоматическое удаление уведомления
    if (notification.autoDismiss && notification.duration) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const success = useCallback((message: string, options?: Partial<NotificationOptions>): string => {
    return addNotification({
      message,
      type: 'success',
      duration: 4000,
      autoDismiss: true,
      ...options,
    });
  }, [addNotification]);

  const error = useCallback((message: string, options?: Partial<NotificationOptions>): string => {
    return addNotification({
      message,
      type: 'error',
      duration: 6000,
      autoDismiss: true,
      ...options,
    });
  }, [addNotification]);

  const info = useCallback((message: string, options?: Partial<NotificationOptions>): string => {
    return addNotification({
      message,
      type: 'info',
      duration: 5000,
      autoDismiss: true,
      ...options,
    });
  }, [addNotification]);

  const loading = useCallback((message: string, options?: Partial<NotificationOptions>): string => {
    return addNotification({
      message,
      type: 'loading',
      autoDismiss: false,
      ...options,
    });
  }, [addNotification]);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    success,
    error,
    info,
    loading,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification должен использоваться внутри NotificationProvider');
  }
  return context;
};