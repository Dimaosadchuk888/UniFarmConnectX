import React, { useEffect, useState } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { getTelegramUserDisplayName, isTelegramWebApp } from '@/services/telegramService';
import { 
  isWalletConnected, 
  getWalletAddress
} from '@/services/tonConnectService';

const WelcomeSection: React.FC = () => {
  const [userName, setUserName] = useState<string>('Пользователь');
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [tonConnectUI] = useTonConnectUI();
  
  // Обновляем состояние кошелька при изменении tonConnectUI
  useEffect(() => {
    if (tonConnectUI) {
      setWalletConnected(isWalletConnected(tonConnectUI));
      setWalletAddress(getWalletAddress(tonConnectUI));
      
      // Создаем обработчик событий изменения кошелька
      const handleWalletUpdate = () => {
        setWalletConnected(isWalletConnected(tonConnectUI));
        setWalletAddress(getWalletAddress(tonConnectUI));
      };
      
      // Подписываемся на события изменения состояния кошелька
      tonConnectUI.onStatusChange(handleWalletUpdate);
      
      return () => {
        // Отписываемся при размонтировании
        // Обратите внимание, что для TonConnectUI нет метода off
        // поэтому здесь не нужен явный cleanup
      };
    }
  }, [tonConnectUI]);
  
  useEffect(() => {
    // Этап 10.3: Всегда используем getTelegramUserDisplayName независимо от среды
    const displayName = getTelegramUserDisplayName();
    setUserName(displayName);
  }, []);
  
  return (
    <div className="bg-gradient-to-br from-primary/80 to-primary/40 rounded-xl p-5 mb-6 shadow-md backdrop-blur-sm border border-white/5">
      {/* Main content with logo in the left corner */}
      <div className="flex items-start justify-between">
        {/* Logo in left corner */}
        <div className="flex items-center mb-4">
          {/* Enhanced coin with the letter U */}
          <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-primary via-purple-600 to-purple-800 flex items-center justify-center mr-2.5 border-[2px] border-white/20 shadow-md shadow-primary/30 unifarm-logo-glow overflow-hidden coin-3d-effect">
            {/* Inner glow effect - уменьшен и не выходит за края */}
            <div className="absolute inset-1 bg-gradient-to-tr from-accent/30 to-transparent opacity-70 rounded-full"></div>
            {/* Shine effect - уменьшен и смещен для предотвращения размытия по краям */}
            <div className="absolute -top-4 -left-4 w-8 h-8 bg-white/40 blur-sm rotate-45 transform"></div>
            {/* Dot pattern for coin texture */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-1/4 left-1/4 w-0.5 h-0.5 bg-white rounded-full"></div>
              <div className="absolute top-1/4 right-1/4 w-0.5 h-0.5 bg-white rounded-full"></div>
              <div className="absolute bottom-1/4 left-1/4 w-0.5 h-0.5 bg-white rounded-full"></div>
              <div className="absolute bottom-1/4 right-1/4 w-0.5 h-0.5 bg-white rounded-full"></div>
            </div>
            {/* Letter U with stylized appearance - уменьшен размер шрифта */}
            <span className="relative text-white text-2xl font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">U</span>
          </div>
          {/* Text "UniFarm" with enhanced styling */}
          <div className="text-xl font-bold bg-gradient-to-r from-primary via-purple-500 to-accent bg-clip-text text-transparent drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
            UniFarm
          </div>
        </div>
        
        {/* Wallet icon on the right side */}
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="22" 
            height="22" 
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
      
      <div className="mt-2">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {userName}
          </h1>
          <p className="text-white/80 text-sm mb-1 font-medium">
            Добро пожаловать в систему UniFarm
          </p>
          
          {walletConnected && walletAddress && (
            <div className="mt-2 inline-flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              <span className="text-xs text-white/70">
                Кошелек подключен
              </span>
            </div>
          )}
        </div>
        
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="22" 
            height="22" 
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