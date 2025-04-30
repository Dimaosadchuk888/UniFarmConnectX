import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { apiRequest } from '@/lib/queryClient';
import { fetchBalance, type Balance } from '@/services/balanceService';
import { TonConnectUI } from '@tonconnect/ui-react';
import { 
  getWalletAddress, 
  isWalletConnected, 
  connectWallet as connectTonWallet,
  disconnectWallet as disconnectTonWallet
} from '@/services/tonConnectService';

// Тип для контекста пользователя
interface UserContextType {
  userId: number | null;
  username: string | null;
  guestId: string | null;
  telegramId: number | null;
  refCode: string | null;
  // Данные баланса
  uniBalance: number;
  tonBalance: number;
  uniFarmingActive: boolean;
  uniDepositAmount: number;
  uniFarmingBalance: number;
  // Данные кошелька
  isWalletConnected: boolean;
  walletAddress: string | null;
  // Функции
  connectWallet: () => Promise<boolean>;
  disconnectWallet: () => Promise<void>;
  refreshBalance: () => void;
  refreshUserData: () => void;
  // Состояния
  isFetching: boolean;
  isBalanceFetching: boolean;
  error: Error | null;
}

// Контекст с начальным значением undefined
const UserContext = createContext<UserContextType | undefined>(undefined);

// Данные пользователя по умолчанию (используются только для типизации)
const defaultUserData = {
  userId: null,
  username: null,
  guestId: null,
  telegramId: null,
  refCode: null,
  uniBalance: 0,
  tonBalance: 0,
  uniFarmingActive: false,
  uniDepositAmount: 0,
  uniFarmingBalance: 0,
  isWalletConnected: false,
  walletAddress: null,
  isFetching: false,
  isBalanceFetching: false,
  error: null,
  connectWallet: async () => false,
  disconnectWallet: async () => {},
  refreshBalance: () => {},
  refreshUserData: () => {}
};

/**
 * Провайдер контекста пользователя
 */
export function UserProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [tonConnectUI] = useTonConnectUI();
  
  // Состояние пользовательских данных
  const [userId, setUserId] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);
  
  // Состояние баланса
  const [balance, setBalance] = useState<Balance>({
    uniBalance: 0,
    tonBalance: 0,
    uniFarmingActive: false,
    uniDepositAmount: 0,
    uniFarmingBalance: 0
  });
  
  // Состояние ошибки
  const [error, setError] = useState<Error | null>(null);
  
  // Запрос данных пользователя
  const { 
    data: userData,
    isFetching,
    refetch: refetchUserData
  } = useQuery({
    queryKey: ['/api/me'],
    retry: 3,
    staleTime: 30000, // 30 секунд до устаревания данных
  });
  
  // Запрос баланса
  const {
    data: balanceData,
    isFetching: isBalanceFetching,
    refetch: refetchBalance
  } = useQuery({
    queryKey: ['/api/wallet/balance', userId],
    enabled: userId !== null, // Запрос активен только если есть userId
    refetchInterval: 10000, // Обновление каждые 10 секунд
  });

  // Обновление данных пользователя при изменении userData
  useEffect(() => {
    if (userData && userData.success && userData.data) {
      const user = userData.data;
      
      // Установка основных данных пользователя
      setUserId(user.id || null);
      setUsername(user.username || null);
      setGuestId(user.guest_id || null);
      setTelegramId(user.telegram_id || null);
      setRefCode(user.ref_code || null);
      
      console.log('[UserContext] Данные пользователя обновлены:', {
        id: user.id,
        username: user.username,
        guest_id: user.guest_id,
        telegram_id: user.telegram_id,
        ref_code: user.ref_code
      });
    } else if (userData && !userData.success) {
      console.error('[UserContext] Ошибка получения данных пользователя:', userData.error);
      setError(new Error(userData.error || 'Ошибка получения данных пользователя'));
    }
  }, [userData]);

  // Обновление баланса при изменении balanceData
  useEffect(() => {
    if (balanceData && balanceData.success && balanceData.data) {
      try {
        // Получаем данные о балансе из API
        const balanceInfo: Balance = {
          uniBalance: parseFloat(balanceData.data.balance_uni) || 0,
          tonBalance: parseFloat(balanceData.data.balance_ton) || 0,
          uniFarmingActive: !!balanceData.data.uni_farming_active,
          uniDepositAmount: parseFloat(balanceData.data.uni_deposit_amount) || 0,
          uniFarmingBalance: parseFloat(balanceData.data.uni_farming_balance) || 0
        };
        
        // Обновляем состояние баланса
        setBalance(balanceInfo);
        
        console.log('[UserContext] Баланс обновлен:', balanceInfo);
      } catch (err) {
        console.error('[UserContext] Ошибка обработки данных баланса:', err);
        setError(err instanceof Error ? err : new Error('Ошибка обработки данных баланса'));
      }
    } else if (balanceData && !balanceData.success) {
      console.error('[UserContext] Ошибка получения баланса:', balanceData.error);
      setError(new Error(balanceData.error || 'Ошибка получения баланса'));
    }
  }, [balanceData]);

  // Обновление состояния подключения кошелька
  useEffect(() => {
    const checkWalletStatus = () => {
      const connected = isWalletConnected(tonConnectUI);
      console.log('[UserContext] Статус подключения кошелька:', connected);
    };
    
    // Проверяем при монтировании и изменении tonConnectUI
    checkWalletStatus();
    
    // Подписываемся на изменения состояния подключения
    window.addEventListener('ton-connect-wallet-connected', checkWalletStatus);
    window.addEventListener('ton-connect-wallet-disconnected', checkWalletStatus);
    
    return () => {
      window.removeEventListener('ton-connect-wallet-connected', checkWalletStatus);
      window.removeEventListener('ton-connect-wallet-disconnected', checkWalletStatus);
    };
  }, [tonConnectUI]);

  // Функция для подключения TON-кошелька
  const connectWallet = useCallback(async (): Promise<boolean> => {
    try {
      const result = await connectTonWallet(tonConnectUI);
      
      if (result) {
        // При успешном подключении обновляем адрес и сохраняем его на сервере
        const address = getWalletAddress(tonConnectUI);
        
        if (userId && address) {
          // Вызываем API для сохранения адреса кошелька
          await apiRequest('/api/wallet/connect', {
            method: 'POST',
            body: JSON.stringify({
              user_id: userId,
              wallet_address: address
            })
          });
          
          // Обновляем данные после подключения
          refetchUserData();
          refetchBalance();
        }
      }
      
      return result;
    } catch (err) {
      console.error('[UserContext] Ошибка при подключении кошелька:', err);
      setError(err instanceof Error ? err : new Error('Ошибка при подключении кошелька'));
      return false;
    }
  }, [tonConnectUI, userId, refetchUserData, refetchBalance]);

  // Функция для отключения TON-кошелька
  const disconnectWallet = useCallback(async (): Promise<void> => {
    try {
      await disconnectTonWallet(tonConnectUI);
      
      if (userId) {
        // Вызываем API для отключения кошелька
        await apiRequest('/api/wallet/disconnect', {
          method: 'POST',
          body: JSON.stringify({
            user_id: userId
          })
        });
        
        // Обновляем данные после отключения
        refetchUserData();
      }
    } catch (err) {
      console.error('[UserContext] Ошибка при отключении кошелька:', err);
      setError(err instanceof Error ? err : new Error('Ошибка при отключении кошелька'));
    }
  }, [tonConnectUI, userId, refetchUserData]);

  // Функция для принудительного обновления баланса
  const refreshBalance = useCallback(() => {
    if (userId) {
      console.log('[UserContext] Запрошено обновление баланса для пользователя:', userId);
      refetchBalance();
    }
  }, [userId, refetchBalance]);

  // Функция для принудительного обновления данных пользователя
  const refreshUserData = useCallback(() => {
    console.log('[UserContext] Запрошено обновление данных пользователя');
    refetchUserData();
  }, [refetchUserData]);

  // Проверка текущего состояния подключения кошелька
  const currentWalletConnected = isWalletConnected(tonConnectUI);
  const currentWalletAddress = getWalletAddress(tonConnectUI);

  // Формируем значение контекста
  const value: UserContextType = {
    userId,
    username,
    guestId,
    telegramId,
    refCode,
    // Данные баланса
    uniBalance: balance.uniBalance,
    tonBalance: balance.tonBalance,
    uniFarmingActive: balance.uniFarmingActive,
    uniDepositAmount: balance.uniDepositAmount, 
    uniFarmingBalance: balance.uniFarmingBalance,
    // Данные кошелька
    isWalletConnected: currentWalletConnected,
    walletAddress: currentWalletAddress,
    // Функции
    connectWallet,
    disconnectWallet,
    refreshBalance,
    refreshUserData,
    // Состояния
    isFetching,
    isBalanceFetching,
    error
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * Хук для использования контекста пользователя
 */
export function useUser(): UserContextType {
  const context = useContext(UserContext);
  
  if (context === undefined) {
    throw new Error('useUser должен использоваться внутри UserProvider');
  }
  
  return context;
}