import React, { useEffect, useState } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { getTelegramUserDisplayName, isTelegramWebApp } from '@/services/telegramService';
import { 
  isWalletConnected, 
  getWalletAddress
} from '@/services/tonConnectService';
import { useUser } from '@/contexts/userContext';

const SafeWelcomeSection: React.FC = () => {
  const { userId, username, isFetching } = useUser();
  const [userName, setUserName] = useState<string>('Пользователь');
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [tonConnectUI] = useTonConnectUI();

  // Показываем загрузку при отсутствии данных пользователя
  if (isFetching) {
    return (
      <div className="bg-card/50 backdrop-blur-sm border border-border/40 rounded-xl p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-48 mb-2"></div>
          <div className="h-4 bg-muted rounded w-32"></div>
        </div>
      </div>
    );
  }

  // Безопасное обновление имени пользователя
  useEffect(() => {
    try {
      if (username) {
        setUserName(username);
      } else if (isTelegramWebApp()) {
        const telegramName = getTelegramUserDisplayName();
        if (telegramName) {
          setUserName(telegramName);
        }
      }
    } catch (error) {
      console.error('[SafeWelcomeSection] Ошибка получения имени:', error);
      setUserName('Пользователь');
    }
  }, [username]);

  // Безопасное обновление состояния кошелька
  useEffect(() => {
    try {
      if (tonConnectUI) {
        setWalletConnected(isWalletConnected(tonConnectUI));
        setWalletAddress(getWalletAddress(tonConnectUI));
        
        const unsubscribe = tonConnectUI.onStatusChange(() => {
          try {
            setWalletConnected(isWalletConnected(tonConnectUI));
            setWalletAddress(getWalletAddress(tonConnectUI));
          } catch (error) {
            console.error('[SafeWelcomeSection] Ошибка обновления кошелька:', error);
          }
        });
        
        return unsubscribe;
      }
    } catch (error) {
      console.error('[SafeWelcomeSection] Ошибка инициализации кошелька:', error);
    }
  }, [tonConnectUI]);

  return (
    <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 rounded-xl border border-border/40 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Добро пожаловать, {userName}!
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {userId ? `ID: ${userId}` : 'Загрузка профиля...'}
          </p>
        </div>
        
        <div className="flex flex-col items-end space-y-2">
          {walletConnected ? (
            <div className="flex items-center space-x-2 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium">TON подключен</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-xs">Кошелек не подключен</span>
            </div>
          )}
          
          {walletAddress && (
            <span className="text-xs text-muted-foreground font-mono">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>UniFarm Connect</span>
        <span>Telegram Mini App</span>
      </div>
    </div>
  );
};

export default SafeWelcomeSection;