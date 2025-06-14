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

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  token?: string;
  user?: any;
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
      dispatch({ type: 'SET_LOADING', payload: { field: 'isFetching', value: true } });
      
      try {
        const telegramData = window.Telegram?.WebApp;
        
        console.log('[UserContext] Проверка Telegram данных:', {
          telegramAvailable: !!window.Telegram,
          webAppAvailable: !!telegramData,
          initDataPresent: !!telegramData?.initData,
          initDataLength: telegramData?.initData?.length || 0,
          userPresent: !!telegramData?.initDataUnsafe?.user
        });

        // Если есть пользователь но нет initData - прямая регистрация
        if (telegramData && telegramData.initDataUnsafe?.user && (!telegramData.initData || telegramData.initData.length === 0)) {
          const user = telegramData.initDataUnsafe.user;
          console.log('[UserContext] Прямая регистрация для пользователя:', user);
          
          try {
            const directRegisterResponse = await fetch('/api/v2/register/telegram', {
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

            const directData = await directRegisterResponse.json();

            if (directRegisterResponse.ok && directData.success && directData.token) {
              console.log('[UserContext] ✅ Прямая регистрация успешна');
              localStorage.setItem('unifarm_auth_token', directData.token);
              localStorage.setItem('unifarm_user_data', JSON.stringify(directData.user));
              
              dispatch({
                type: 'SET_USER_DATA',
                payload: {
                  userId: directData.user.id,
                  username: directData.user.username,
                  telegramId: directData.user.telegram_id,
                  refCode: directData.user.ref_code
                }
              });
              return;
            }
          } catch (directError) {
            console.log('[UserContext] Ошибка прямой регистрации:', directError);
          }
        }

        // Основной поток: auth → register fallback
        if (telegramData?.initData && telegramData.initData.length > 0) {
          console.log('[UserContext] Попытка авторизации с initData');
          
          try {
            const authResponse = await fetch('/api/v2/auth/telegram', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': telegramData.initData
              },
              body: JSON.stringify({ 
                initData: telegramData.initData,
                refBy: new URLSearchParams(window.location.search).get('ref')
              })
            });

            const authData = await authResponse.json();
            
            if (authResponse.ok && authData.success && authData.token) {
              console.log('[UserContext] ✅ Авторизация успешна');
              localStorage.setItem('unifarm_auth_token', authData.token);
              localStorage.setItem('unifarm_user_data', JSON.stringify(authData.user));
              
              dispatch({
                type: 'SET_USER_DATA',
                payload: {
                  userId: authData.user.id,
                  username: authData.user.username,
                  telegramId: authData.user.telegram_id,
                  refCode: authData.user.ref_code
                }
              });
              return;
            } else {
              throw new Error('Auth failed');
            }
          } catch (authError) {
            console.log('[UserContext] Авторизация не удалась, пробуем регистрацию');
            
            try {
              const registerResponse = await fetch('/api/v2/register/telegram', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Telegram-Init-Data': telegramData.initData
                },
                body: JSON.stringify({ 
                  initData: telegramData.initData,
                  refBy: new URLSearchParams(window.location.search).get('ref')
                })
              });

              const registerData = await registerResponse.json();
              
              if (registerResponse.ok && registerData.success && registerData.token) {
                console.log('[UserContext] ✅ Регистрация успешна');
                localStorage.setItem('unifarm_auth_token', registerData.token);
                localStorage.setItem('unifarm_user_data', JSON.stringify(registerData.user));
                
                dispatch({
                  type: 'SET_USER_DATA',
                  payload: {
                    userId: registerData.user.id,
                    username: registerData.user.username,
                    telegramId: registerData.user.telegram_id,
                    refCode: registerData.user.ref_code
                  }
                });
                return;
              }
            } catch (registerError) {
              console.log('[UserContext] Регистрация не удалась');
            }
          }
        }
      } catch (error) {
        console.log('[UserContext] Общая ошибка авторизации:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { field: 'isFetching', value: false } });
      }
    };

    // Проверяем сохраненные данные
    const savedToken = localStorage.getItem('unifarm_auth_token');
    const savedUserData = localStorage.getItem('unifarm_user_data');

    if (savedToken && savedUserData) {
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
        refreshUserData();
      } catch (parseError) {
        localStorage.removeItem('unifarm_auth_token');
        localStorage.removeItem('unifarm_user_data');
        loadInitialUserData();
      }
    } else {
      loadInitialUserData();
    }
  }, []);

  const value: UserContextType = {
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
  };

  return (
    <UserContext.Provider value={value}>
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