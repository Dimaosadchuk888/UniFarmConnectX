/**
 * Компонент для проверки запуска приложения в Telegram Mini App
 * Проверяет наличие необходимых API и окружения Telegram
 */
import React, { useEffect, useState } from 'react';
import { isTelegramWebApp } from '@/services/telegramService';

// Стили для экрана блокировки
const blockScreenStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#f5f5f5',
  zIndex: 9999,
  padding: '20px',
  textAlign: 'center',
  color: '#333',
};

const logoStyle: React.CSSProperties = {
  fontSize: '3rem',
  marginBottom: '20px',
  color: '#0088cc',
};

interface TelegramWebAppCheckProps {
  children: React.ReactNode;
}

export default function TelegramWebAppCheck({ children }: TelegramWebAppCheckProps) {
  const [isTelegram, setIsTelegram] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Проверяем запуск в Telegram
    const checkTelegram = () => {
      const result = isTelegramWebApp();
      console.log('[Telegram Check]', {
        isTelegramAvailable: result,
        host: window.location.hostname,
        isDevelopment: process.env.NODE_ENV === 'development'
      });
      setIsTelegram(result);
    };
    
    checkTelegram();
    
    // Повторная проверка через 1 секунду для случаев медленной инициализации
    const timer = setTimeout(() => {
      if (!isTelegram) {
        checkTelegram();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Пока проверяем, показываем загрузку
  if (isTelegram === null) {
    return (
      <div style={blockScreenStyle}>
        <div style={logoStyle}>⏳</div>
        <h2>Загрузка UniFarm...</h2>
        <p>Подождите, идет проверка окружения</p>
      </div>
    );
  }
  
  // Если не в Telegram, показываем блокировку
  if (!isTelegram) {
    return (
      <div style={blockScreenStyle}>
        <div style={logoStyle}>🔒</div>
        <h2>UniFarm доступен только в Telegram</h2>
        <p>Для использования сервиса откройте ссылку в приложении Telegram</p>
        <div style={{marginTop: '20px', fontSize: '0.9rem', opacity: 0.8}}>
          <p>Как воспользоваться UniFarm:</p>
          <ol style={{textAlign: 'left', maxWidth: '400px', margin: '0 auto'}}>
            <li>Откройте приложение Telegram на телефоне</li>
            <li>Перейдите к боту @UniFarmApp_bot</li>
            <li>Нажмите кнопку СТАРТ для начала</li>
          </ol>
        </div>
      </div>
    );
  }
  
  // Если в Telegram, показываем приложение
  return <>{children}</>;
}