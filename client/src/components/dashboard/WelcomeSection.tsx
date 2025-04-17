import React, { useEffect, useState } from 'react';
import { getTelegramUserDisplayName, isTelegramWebApp } from '@/services/telegramService';
import { 
  isWalletConnected, 
  getWalletAddress, 
  shortenAddress, 
  addConnectionListener,
  removeConnectionListener
} from '@/services/tonConnectService';

const WelcomeSection: React.FC = () => {
  const [userName, setUserName] = useState<string>('Пользователь');
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  
  // Функция для проверки статуса подключения кошелька
  const checkWalletConnection = () => {
    setWalletConnected(isWalletConnected());
    setWalletAddress(getWalletAddress());
  };
  
  useEffect(() => {
    // Получаем имя пользователя из Telegram WebApp
    if (isTelegramWebApp()) {
      const displayName = getTelegramUserDisplayName();
      setUserName(displayName);
    }
    
    // Проверяем начальное подключение кошелька
    checkWalletConnection();
    
    // Подписываемся на централизованные обновления статуса подключения
    addConnectionListener(checkWalletConnection);
    
    // Отписываемся при размонтировании компонента
    return () => {
      removeConnectionListener(checkWalletConnection);
    };
  }, []);
  
  return (
    <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl p-5 mb-6 shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Привет, {userName}!
          </h1>
          <p className="text-purple-200 text-sm mb-3">
            Добро пожаловать в UniFarm
          </p>
          
          {walletConnected && walletAddress ? (
            <div className="bg-white/10 rounded-md px-3 py-1.5 inline-flex items-center space-x-1.5">
              <span className="text-xs text-purple-100">
                Кошелек: {shortenAddress(walletAddress)}
              </span>
            </div>
          ) : (
            <div className="bg-white/10 rounded-md px-3 py-1.5 inline-flex items-center space-x-1.5">
              <span className="text-xs text-purple-100">
                Подключите TON-кошелек в разделе Кошелек
              </span>
            </div>
          )}
        </div>
        
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="white" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
            <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
            <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default WelcomeSection;