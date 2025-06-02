import React from 'react';
import { useNotification } from '@/contexts/NotificationContext';
import { X, CheckCircle, XCircle, Info, Loader2 } from 'lucide-react';
import { NotificationType } from '@/types/notification';

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBackgroundColor = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/90';
      case 'error':
        return 'bg-red-500/90';
      case 'info':
        return 'bg-blue-500/90';
      case 'loading':
        return 'bg-gray-500/90';
      default:
        return 'bg-gray-500/90';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            ${getBackgroundColor(notification.type)} 
            backdrop-blur-md 
            text-white 
            px-4 py-3 
            rounded-lg 
            shadow-lg 
            border border-white/20
            flex items-center 
            gap-3 
            min-w-[300px] 
            max-w-[400px]
            transform transition-all duration-300 ease-in-out
            animate-in slide-in-from-right
          `}
        >
          {getIcon(notification.type)}
          
          <div className="flex-1 text-sm font-medium">
            {notification.message}
          </div>

          <button
            onClick={() => removeNotification(notification.id)}
            className="
              p-1 
              rounded-full 
              hover:bg-white/20 
              transition-colors 
              duration-200
              flex-shrink-0
            "
            aria-label="Закрыть уведомление"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;