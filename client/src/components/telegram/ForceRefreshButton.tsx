/**
 * Компонент принудительного обновления UniFarm
 * 
 * Предоставляет пользователю возможность принудительно обновить приложение
 * для получения последней версии без кэширования
 */

import React from 'react';
import { Button } from "@/components/ui/button";

interface ForceRefreshButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  showIcon?: boolean;
}

const ForceRefreshButton: React.FC<ForceRefreshButtonProps> = ({
  variant = 'outline',
  size = 'default',
  className = '',
  showIcon = true
}) => {
  
  const handleForceRefresh = () => {
    try {// Очищаем все возможные кэши
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            caches.delete(cacheName);});
        });
      }
      
      // Создаем URL с параметрами принудительного обновления
      const url = new URL(window.location.href);
      url.searchParams.set('force', Date.now().toString());
      url.searchParams.set('nocache', Math.random().toString(36).substring(7));// Принудительная перезагрузка страницы с новыми параметрами
      window.location.href = url.toString();
      
    } catch (error) {// Fallback - простая перезагрузка
      window.location.reload();
    }
  };

  return (
    <Button
      onClick={handleForceRefresh}
      variant={variant}
      size={size}
      className={className}
    >
      {showIcon && <span className="mr-2">🔄</span>}
      Обновить UniFarm
    </Button>
  );
};

export default ForceRefreshButton;