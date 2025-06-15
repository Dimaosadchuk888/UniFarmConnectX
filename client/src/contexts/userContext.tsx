import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { TonConnectUI } from '@tonconnect/ui-react';

// Типы данных
interface Balance {
  uniBalance: number;
  tonBalance: number;
  uniFarmingActive: boolean;
  uniDepositAmount: number;
  uniFarmingBalance: number;
}

interface UserContextType {
  userId: number | null;
  username: string | null;
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

interface UserState {
  userId: number | null;
  username: string | null;
  telegramId: number | null;
  refCode: string | null;
  
  balanceState: Balance;
  
  walletConnected: boolean;
  walletAddress: string | null;
  
  isFetching: boolean;
  isBalanceFetching: boolean;
  error: Error | null;
}

const initialState: UserState = {
  userId: null,
  username: null,
  telegramId: null,
  refCode: null,
  
  balanceState: {
    uniBalance: 0,
    tonBalance: 0,
    uniFarmingActive: false,
    uniDepositAmount: 0,
    uniFarmingBalance: 0
  },
  
  walletConnected: false,
  walletAddress: null,
  
  isFetching: false,
  isBalanceFetching: false,
  error: null
};

type UserAction =
  | { type: 'SET_USER_DATA'; payload: Partial<UserState> }
  | { type: 'SET_BALANCE'; payload: Balance }
  | { type: 'SET_WALLET_CONNECTED'; payload: { connected: boolean; address: string | null } }
  | { type: 'SET_LOADING'; payload: { field: 'isFetching' | 'isBalanceFetching'; value: boolean } }
  | { type: 'SET_ERROR'; payload: Error | null };

function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    case 'SET_USER_DATA':
      return { ...state, ...action.payload };
    case 'SET_BALANCE':
      return { ...state, balanceState: action.payload };
    case 'SET_WALLET_CONNECTED':
      return { 
        ...state, 
        walletConnected: action.payload.connected,
        walletAddress: action.payload.address 
      };
    case 'SET_LOADING':
      return { ...state, [action.payload.field]: action.payload.value };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(userReducer, initialState);
  const tonConnectUI = new TonConnectUI({
    manifestUrl: `${window.location.origin}/tonconnect-manifest.json`,
  });
  const initializedRef = useRef(false);

  // Wallet functions
  const connectWallet = async (): Promise<boolean> => {
    try {
      const connectedWallet = await tonConnectUI.connectWallet();
      if (connectedWallet) {
        dispatch({
          type: 'SET_WALLET_CONNECTED',
          payload: { connected: true, address: connectedWallet.account.address }
        });
        return true;
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
    return false;
  };

  const disconnectWallet = async (): Promise<void> => {
    try {
      await tonConnectUI.disconnect();
      dispatch({
        type: 'SET_WALLET_CONNECTED',
        payload: { connected: false, address: null }
      });
    } catch (error) {
      console.error('Wallet disconnect failed:', error);
    }
  };

  const refreshBalance = async (forceRefresh: boolean = false) => {
    if (state.isBalanceFetching && !forceRefresh) return;
    
    dispatch({ type: 'SET_LOADING', payload: { field: 'isBalanceFetching', value: true } });
    
    try {
      const token = localStorage.getItem('unifarm_auth_token');
      if (!token) return;

      const response = await fetch('/api/v2/wallet/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          dispatch({
            type: 'SET_BALANCE',
            payload: {
              uniBalance: data.data.uniBalance || 0,
              tonBalance: data.data.tonBalance || 0,
              uniFarmingActive: data.data.uniFarmingActive || false,
              uniDepositAmount: data.data.uniDepositAmount || 0,
              uniFarmingBalance: data.data.uniFarmingBalance || 0
            }
          });
        }
      }
    } catch (error) {
      console.error('Balance refresh failed:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { field: 'isBalanceFetching', value: false } });
    }
  };

  const refreshUserData = async () => {
    const token = localStorage.getItem('unifarm_auth_token');
    if (!token) return;

    try {
      const response = await fetch('/api/v2/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          dispatch({
            type: 'SET_USER_DATA',
            payload: {
              userId: data.user.id,
              username: data.user.username,
              telegramId: data.user.telegram_id,
              refCode: data.user.ref_code
            }
          });
          localStorage.setItem('unifarm_user_data', JSON.stringify(data.user));
        }
      }
    } catch (error) {
      console.error('User data refresh failed:', error);
    }
  };

  const registerDirectFromTelegramUser = async (user: any) => {
    try {
      const response = await fetch('/api/v2/register/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: user.id,
          username: user.username || '',
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          language_code: user.language_code || 'en',
          refBy: new URLSearchParams(window.location.search).get('ref'),
          direct_registration: true
        })
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        console.log('[UserContext] Direct registration successful');
        localStorage.setItem('unifarm_auth_token', data.token);
        localStorage.setItem('unifarm_user_data', JSON.stringify(data.user));
        return { success: true, user: data.user, token: data.token };
      } else {
        console.log('[UserContext] Direct registration failed:', data);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.log('[UserContext] Direct registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  };

  // TON Connect wallet status check
  useEffect(() => {
    if (initializedRef.current) return;
    
    try {
      const wallet = tonConnectUI.wallet;
      if (wallet?.account?.address) {
        const address = wallet.account.address;
        dispatch({
          type: 'SET_WALLET_CONNECTED',
          payload: { connected: true, address }
        });
      }
    } catch (err) {}
    
    initializedRef.current = true;
  }, [tonConnectUI]);

  // Автоматическая авторизация при загрузке
  useEffect(() => {
    const loadInitialUserData = async () => {
      console.log('[UserContext] Автоматическая загрузка данных пользователя...');
      dispatch({ type: 'SET_LOADING', payload: { field: 'isFetching', value: true } });
      
      try {
        // Проверяем сохраненный токен из localStorage
        const savedToken = localStorage.getItem('unifarm_auth_token');
        const savedUserData = localStorage.getItem('unifarm_user_data');
        
        if (savedToken && savedUserData) {
          console.log('[UserContext] Восстановление сессии из localStorage');
          try {
            const userData = JSON.parse(savedUserData);
            dispatch({
              type: 'SET_USER_DATA',
              payload: {
                userId: userData.id,
                username: userData.username,
                telegramId: userData.telegram_id,
                refCode: userData.ref_code
              }
            });
            refreshBalance();
            return;
          } catch (error) {
            console.log('[UserContext] Ошибка восстановления сессии:', error);
            localStorage.removeItem('unifarm_auth_token');
            localStorage.removeItem('unifarm_user_data');
          }
        }

        // Безопасная проверка наличия Telegram WebApp
        const telegramData = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
        
        if (telegramData) {
          console.log('[UserContext] Проверка Telegram данных:', {
            telegramAvailable: !!window.Telegram,
            webAppAvailable: !!telegramData,
            initDataPresent: !!telegramData.initData,
            initDataLength: telegramData.initData?.length || 0,
            userPresent: !!telegramData.initDataUnsafe?.user
          });
        }

        // Проверяем наличие initData для авторизации
        if (telegramData && telegramData.initData && telegramData.initData.length > 0) {
          console.log('[UserContext] Авторизация через initData');
          
          try {
            const response = await fetch('/api/v2/auth/telegram', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                initData: telegramData.initData
              })
            });

            const data = await response.json();
            
            if (response.ok && data.success && data.token) {
              console.log('[UserContext] initData авторизация успешна');
              localStorage.setItem('unifarm_auth_token', data.token);
              localStorage.setItem('unifarm_user_data', JSON.stringify(data.user));
              
              dispatch({
                type: 'SET_USER_DATA',
                payload: {
                  userId: data.user.id,
                  username: data.user.username,
                  telegramId: data.user.telegram_id,
                  refCode: data.user.ref_code
                }
              });
              
              refreshBalance();
              return;
            }
          } catch (error) {
            console.log('[UserContext] initData авторизация не удалась:', error);
          }
        }

        // Fallback: Прямая регистрация через initDataUnsafe
        if (telegramData && telegramData.initDataUnsafe?.user) {
          console.log('[UserContext] Fallback регистрация через initDataUnsafe');
          
          const result = await registerDirectFromTelegramUser(telegramData.initDataUnsafe.user);
          if (result.success) {
            dispatch({
              type: 'SET_USER_DATA',
              payload: {
                userId: result.user.id,
                username: result.user.username,
                telegramId: result.user.telegram_id,
                refCode: result.user.ref_code
              }
            });
            refreshBalance();
            return;
          }
        }

        // Если нет Telegram данных, показываем состояние ожидания авторизации
        console.log('[UserContext] Ожидание авторизации через Telegram');
        dispatch({
          type: 'SET_ERROR',
          payload: new Error('Требуется авторизация через Telegram Mini App')
        });
        
      } catch (error) {
        console.error('[UserContext] Ошибка получения данных пользователя:', error);
        dispatch({ type: 'SET_ERROR', payload: error as Error });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { field: 'isFetching', value: false } });
      }
    };

    loadInitialUserData();
  }, []);

  // Периодическое обновление данных
  useEffect(() => {
    if (!state.userId) return;
    
    const interval = setInterval(() => {
      refreshUserData();
    }, 300000); // Каждые 5 минут

    return () => clearInterval(interval);
  }, [state.userId]);

  return (
    <UserContext.Provider
      value={{
        userId: state.userId,
        username: state.username,
        telegramId: state.telegramId,
        refCode: state.refCode,
        
        uniBalance: state.balanceState.uniBalance,
        tonBalance: state.balanceState.tonBalance,
        uniFarmingActive: state.balanceState.uniFarmingActive,
        uniDepositAmount: state.balanceState.uniDepositAmount,
        uniFarmingBalance: state.balanceState.uniFarmingBalance,
        
        isWalletConnected: state.walletConnected,
        walletAddress: state.walletAddress,
        
        connectWallet,
        disconnectWallet,
        refreshBalance,
        refreshUserData,
        
        isFetching: state.isFetching,
        isBalanceFetching: state.isBalanceFetching,
        error: state.error
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export default UserContext;