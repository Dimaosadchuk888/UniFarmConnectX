import React from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'loading';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

interface NotificationContainerProps {
  notifications?: Notification[];
  onRemove?: (id: string) => void;
}

const NotificationContainer: React.FC<NotificationContainerProps> = () => {
  return null;
};

export default NotificationContainer;