/**
 * Компонент кнопки закрытия Telegram Mini App
 * 
 * Предоставляет пользователю возможность корректно закрыть приложение
 * через официальный Telegram.WebApp.close() API
 */

import React from 'react';
import { Button } from "@/components/ui/button";
import { SafeTelegramAPI } from '../../services/telegramErrorService';

interface TelegramCloseButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  showIcon?: boolean;
}

const TelegramCloseButton: React.FC<TelegramCloseButtonProps> = ({
  variant = 'outline',
  size = 'default',
  className = '',
  showIcon = true
}) => {
  
  const handleClose = async () => {
    try {// Вызываем безопасный метод закрытия
      const success = await SafeTelegramAPI.close();
      
      if (success) {} else {// Fallback для браузера
        if (typeof window !== 'undefined' && window.history.length > 1) {
          window.history.back();
        }
      }
    } catch (error) {}
  };

  return (
    <Button
      onClick={handleClose}
      variant={variant}
      size={size}
      className={className}
    >
      {showIcon && <span className="mr-2">🚪</span>}
      Закрыть UniFarm
    </Button>
  );
};

export default TelegramCloseButton;