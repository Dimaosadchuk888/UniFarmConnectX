import React, { createContext, useContext, useState } from 'react';

// Упрощенный тип для контекста пользователя
interface SimpleUserContextType {
  userId: number | null;
  username: string | null;
  guestId: string | null;
  telegramId: number | null;
  refCode: string | null;
  uniBalance: number;
  tonBalance: number;
  uniFarmingActive: boolean;
  uniDepositAmount: number;
  uniFarmingBalance: number;
  isWalletConnected: boolean;
  walletAddress: string | null;
  connectWallet: () => Promise<boolean>;
  disconnectWallet: () => Promise<void>;
  refreshBalance: (forceRefresh?: boolean) => void;
  refreshUserData: () => void;
  isFetching: boolean;
  isBalanceFetching: boolean;
  error: Error | null;
}

// Создаем контекст
const SimpleUserContext = createContext<SimpleUserContextType | undefined>(undefined);

// Провайдер
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('[SimpleUserContext] Инициализация упрощенного провайдера');
  
  // Простое состояние
  const [state] = useState({
    userId: 1,
    username: 'Demo User',
    guestId: 'guest_demo',
    telegramId: null,
    refCode: null,
    uniBalance: 1000,
    tonBalance: 0.5,
    uniFarmingActive: false,
    uniDepositAmount: 0,
    uniFarmingBalance: 0,
    isWalletConnected: false,
    walletAddress: null,
    isFetching: false,
    isBalanceFetching: false,
    error: null
  });
  
  // Простые функции-заглушки
  const connectWallet = async () => {
    console.log('[SimpleUserContext] Connect wallet called');
    return true;
  };
  
  const disconnectWallet = async () => {
    console.log('[SimpleUserContext] Disconnect wallet called');
  };
  
  const refreshBalance = () => {
    console.log('[SimpleUserContext] Refresh balance called');
  };
  
  const refreshUserData = () => {
    console.log('[SimpleUserContext] Refresh user data called');
  };

  const contextValue: SimpleUserContextType = {
    ...state,
    connectWallet,
    disconnectWallet,
    refreshBalance,
    refreshUserData
  };

  return (
    <SimpleUserContext.Provider value={contextValue}>
      {children}
    </SimpleUserContext.Provider>
  );
};

// Хук для использования контекста
export const useUser = (): SimpleUserContextType => {
  const context = useContext(SimpleUserContext);
  if (context === undefined) {
    console.error('[SimpleUserContext] useUser должен использоваться внутри UserProvider');
    // Возвращаем дефолтные значения вместо выброса ошибки
    return {
      userId: 1,
      username: 'Demo User',
      guestId: 'guest_demo',
      telegramId: null,
      refCode: null,
      uniBalance: 1000,
      tonBalance: 0.5,
      uniFarmingActive: false,
      uniDepositAmount: 0,
      uniFarmingBalance: 0,
      isWalletConnected: false,
      walletAddress: null,
      connectWallet: async () => true,
      disconnectWallet: async () => {},
      refreshBalance: () => {},
      refreshUserData: () => {},
      isFetching: false,
      isBalanceFetching: false,
      error: null
    };
  }
  return context;
};