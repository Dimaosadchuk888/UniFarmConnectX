import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { fetchBalance, type Balance } from '@/services/balanceService';
import { 
  getWalletAddress, 
  isWalletConnected, 
  connectWallet as connectTonWallet,
  disconnectWallet as disconnectTonWallet
} from '@/services/tonConnectService';

// Интерфейс для API-ответов
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Тип для контекста пользователя
interface UserContextType {
  userId: number | null;
  username: string | null;
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
  refreshBalance: (forceRefresh?: boolean) => void;
  refreshUserData: () => void;
  // Состояния
  isFetching: boolean;
  isBalanceFetching: boolean;
  error: Error | null;
}

// Тип состояния для useReducer
interface UserState {
  // Данные пользователя
  userId: number | null;
  username: string | null;
  telegramId: number | null;
  refCode: string | null;
  
  // Данные баланса
  balanceState: Balance;
  
  // Состояние кошелька
  walletConnected: boolean;
  walletAddress: string | null;
  
  // Состояния загрузки и ошибок
  isFetching: boolean;
  isBalanceFetching: boolean;
  error: Error | null;
}

// Начальное состояние
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

// Типы действий для reducer
type UserAction =
  | { type: 'SET_USER_DATA'; payload: Partial<UserState> }
  | { type: 'SET_BALANCE'; payload: Balance }
  | { type: 'SET_WALLET_CONNECTED'; payload: { connected: boolean; address: string | null } }
  | { type: 'SET_LOADING'; payload: { field: 'isFetching' | 'isBalanceFetching'; value: boolean } }
  | { type: 'SET_ERROR'; payload: Error | null };

// Reducer функция для обработки действий
function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    case 'SET_USER_DATA':
      return { ...state, ...action.payload };
      
    case 'SET_BALANCE':
      return {
        ...state,
        balanceState: action.payload
      };
      
    case 'SET_WALLET_CONNECTED':
      return {
        ...state,
        walletConnected: action.payload.connected,
        walletAddress: action.payload.address
      };
      
    case 'SET_LOADING':
      return {
        ...state,
        [action.payload.field]: action.payload.value
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
      
    default:
      return state;
  }
}

// Контекст с начальным значением undefined
const UserContext = createContext<UserContextType | undefined>(undefined);

/**
 * Провайдер контекста пользователя с использованием useReducer
 * для предотвращения бесконечных циклов обновления
 */
export function UserProvider({ children }: { children: React.ReactNode }) {
  // Инициализация хуков
  const queryClient = useQueryClient();
  const [tonConnectUI] = useTonConnectUI();
  
  // Создаем состояние с помощью useReducer
  const [state, dispatch] = useReducer(userReducer, initialState);
  
  // Рефы для предотвращения повторных вызовов
  const refreshInProgressRef = useRef<boolean>(false);
  const initializedRef = useRef<boolean>(false);
  
  // Обновление данных пользователя
  const refreshUserData = useCallback(async () => {
    if (refreshInProgressRef.current) {
      return;
    }
    
    refreshInProgressRef.current = true;
    dispatch({ type: 'SET_LOADING', payload: { field: 'isFetching', value: true } });
    
    try {
      // Получаем данные пользователя из localStorage (только Telegram авторизация)
      let apiUrl = '/api/v2/users/profile';
      const lastSessionStr = localStorage.getItem('unifarm_last_session');
      
      if (lastSessionStr) {
        try {
          const lastSession = JSON.parse(lastSessionStr);
          if (lastSession.user_id) {
            apiUrl = `/api/v2/users/profile?user_id=${lastSession.user_id}`;
          }
        } catch (e) {}
      }
      
      const response = await correctApiRequest(apiUrl);
      
      if (response.success && response.data) {
        const user = response.data;
        
        dispatch({
          type: 'SET_USER_DATA',
          payload: {
            userId: user.id || null,
            username: user.username || null,
            telegramId: user.telegram_id || null,
            refCode: user.ref_code || null
          }
        });
        
        dispatch({ type: 'SET_ERROR', payload: null });
        
        // Сохраняем обновленные данные в localStorage
        try {
          localStorage.setItem('unifarm_last_session', JSON.stringify({
            timestamp: new Date().toISOString(),
            user_id: user.id,
            username: user.username || null,
            refCode: user.ref_code || null
          }));
        } catch (e) {}
      } else {
        // Если запрос не удался, проверяем данные в localStorage
        if (lastSessionStr) {
          try {
            const lastSession = JSON.parse(lastSessionStr);
            if (lastSession.user_id) {dispatch({
                type: 'SET_USER_DATA',
                payload: {
                  userId: lastSession.user_id,
                  username: lastSession.username || null,
                  telegramId: null,
                  refCode: lastSession.refCode || null
                }
              });
              dispatch({ type: 'SET_ERROR', payload: null });
            }
          } catch (e) {}
        } else {
          const errorMsg = response.error || response.message || 'Ошибка получения данных пользователя';
          dispatch({ type: 'SET_ERROR', payload: null });
        }
      }
    } catch (err) {
      // Проверяем, если есть данные пользователя в localStorage
      try {
        const lastSessionStr = localStorage.getItem('unifarm_last_session');
        if (lastSessionStr) {
          const lastSession = JSON.parse(lastSessionStr);
          if (lastSession.user_id) {dispatch({
              type: 'SET_USER_DATA',
              payload: {
                userId: lastSession.user_id,
                username: lastSession.username || null,
                telegramId: null,
                refCode: lastSession.refCode || null
              }
            });
            dispatch({ type: 'SET_ERROR', payload: null });
          }
        }
      } catch (e) {}
      
      const error = err instanceof Error ? err : new Error('Ошибка получения данных пользователя');// Не устанавливаем fallback данные, позволяем App.tsx обработать создание пользователя
      dispatch({ type: 'SET_ERROR', payload: null });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { field: 'isFetching', value: false } });
      refreshInProgressRef.current = false;
    }
  }, []);
  
  // Обновление баланса
  const refreshBalance = useCallback(async (forceRefresh: boolean = false) => {
    if (refreshInProgressRef.current || !state.userId) {
      return;
    }
    
    refreshInProgressRef.current = true;
    dispatch({ type: 'SET_LOADING', payload: { field: 'isBalanceFetching', value: true } });
    
    try {
      // Используем улучшенный сервис с поддержкой forceRefreshconst balance = await fetchBalance(state.userId, forceRefresh);
      
      // Обновляем состояние баланса
      dispatch({ type: 'SET_BALANCE', payload: balance });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка получения баланса');// Устанавливаем нулевые балансы вместо блокировки интерфейса
      dispatch({
        type: 'SET_BALANCE',
        payload: {
          uniBalance: 0,
          tonBalance: 0,
          uniFarmingActive: false,
          uniDepositAmount: 0,
          uniFarmingBalance: 0
        }
      });
      dispatch({ type: 'SET_ERROR', payload: null });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { field: 'isBalanceFetching', value: false } });
      refreshInProgressRef.current = false;
    }
  }, [state.userId]);
  
  // Функции работы с кошельком
  const connectWallet = useCallback(async (): Promise<boolean> => {
    try {
      await connectTonWallet(tonConnectUI);
      
      const connected = isWalletConnected(tonConnectUI);
      if (connected) {
        const address = getWalletAddress(tonConnectUI);
        
        dispatch({
          type: 'SET_WALLET_CONNECTED',
          payload: { connected: true, address }
        });
        
        return true;
      }
      
      return false;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка подключения кошелька');// Не блокируем интерфейс, просто логируем ошибку
      dispatch({ type: 'SET_ERROR', payload: null });
      return false;
    }
  }, [tonConnectUI]);
  
  const disconnectWallet = useCallback(async (): Promise<void> => {
    try {
      await disconnectTonWallet(tonConnectUI);
      
      dispatch({
        type: 'SET_WALLET_CONNECTED',
        payload: { connected: false, address: null }
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка отключения кошелька');// Не блокируем интерфейс, просто логируем ошибку
      dispatch({ type: 'SET_ERROR', payload: null });
    }
  }, [tonConnectUI]);
  
  // Проверяем статус подключения кошелька
  useEffect(() => {
    if (initializedRef.current) return;
    
    try {
      // Проверяем, подключен ли кошелек
      const connected = isWalletConnected(tonConnectUI);
      if (connected) {
        const address = getWalletAddress(tonConnectUI);
        
        // Кошелек уже подключен, устанавливаем состояние
        dispatch({
          type: 'SET_WALLET_CONNECTED',
          payload: { connected: true, address }
        });
      }
    } catch (err) {}
    
    initializedRef.current = true;
  }, [tonConnectUI]);
  
  // Автоматическая авторизация через Telegram при первом рендере
  useEffect(() => {
    const loadInitialUserData = async () => {
      try {
        console.log('[UserContext] Автоматическая загрузка данных пользователя...');
        
        // Проверяем наличие Telegram данных
        const telegramData = window.Telegram?.WebApp;
        if (telegramData?.initData && telegramData.initData.length > 0) {
          console.log('[UserContext] Telegram данные найдены, пытаемся авторизоваться...');
          
          // Пробуем авторизацию через Telegram
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
            }).then(res => res.json());

            if (authResponse.success && authResponse.token) {
              console.log('[UserContext] Авторизация успешна');
              localStorage.setItem('unifarm_auth_token', authResponse.token);
              localStorage.setItem('unifarm_user_data', JSON.stringify(authResponse.user));
              
              // Обновляем состояние пользователя
              dispatch({
                type: 'SET_USER_DATA',
                payload: {
                  userId: authResponse.user.id,
                  username: authResponse.user.username,
                  telegramId: authResponse.user.telegram_id,
                  refCode: authResponse.user.ref_code
                }
              });
            } else {
              console.log('[UserContext] Авторизация не удалась, пробуем регистрацию...');
              
              // Если авторизация не прошла, пробуем регистрацию
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
              }).then(res => res.json());

              if (registerResponse.success && registerResponse.token) {
                console.log('[UserContext] Регистрация успешна');
                localStorage.setItem('unifarm_auth_token', registerResponse.token);
                localStorage.setItem('unifarm_user_data', JSON.stringify(registerResponse.user));
                
                // Обновляем состояние пользователя
                dispatch({
                  type: 'SET_USER_DATA',
                  payload: {
                    userId: registerResponse.user.id,
                    username: registerResponse.user.username,
                    telegramId: registerResponse.user.telegram_id,
                    refCode: registerResponse.user.ref_code
                  }
                });
              } else {
                console.log('[UserContext] Регистрация не удалась');
              }
            }
          } catch (telegramError) {
            console.log('[UserContext] Ошибка Telegram авторизации:', telegramError);
          }
        } else {
          console.log('[UserContext] Telegram данные недоступны - анализируем причины...');
          
          // Дополнительная диагностика
          const telegramAvailable = typeof window.Telegram !== 'undefined';
          const webAppAvailable = window.Telegram?.WebApp;
          const initDataPresent = webAppAvailable?.initData;
          const initDataLength = initDataPresent?.length || 0;
          
          console.log('[UserContext] Диагностика Telegram:', {
            telegramAvailable,
            webAppAvailable: !!webAppAvailable,
            initDataPresent: !!initDataPresent,
            initDataLength,
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            isIframe: window !== window.parent
          });
          
          // Проверяем, есть ли признаки Telegram среды без initData
          const possibleTelegramEnv = !!(
            navigator.userAgent.includes('Telegram') ||
            window.parent !== window ||
            document.referrer.includes('telegram')
          );
          
          if (possibleTelegramEnv && webAppAvailable) {
            console.log('[UserContext] ⚠️ Telegram среда обнаружена, но initData пустой');
            console.log('[UserContext] Возможно, приложение запущено в тестовом режиме или есть проблемы с BotFather');
            
            // Пытаемся получить данные из localStorage для fallback
            const storedToken = localStorage.getItem('unifarm_auth_token');
            const storedUserData = localStorage.getItem('unifarm_user_data');
            
            if (storedToken && storedUserData) {
              try {
                const userData = JSON.parse(storedUserData);
                console.log('[UserContext] Восстанавливаем данные из localStorage');
                
                dispatch({
                  type: 'SET_USER_DATA',
                  payload: {
                    userId: userData.id,
                    username: userData.username,
                    telegramId: userData.telegram_id,
                    refCode: userData.ref_code
                  }
                });
              } catch (e) {
                console.log('[UserContext] Ошибка восстановления из localStorage:', e);
              }
            }
          } else {
            console.log('[UserContext] Приложение открыто вне Telegram - включаем демо режим');
            
            // Создаем временный гостевой ID для демонстрации
            const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            console.log('Demo mode: using guest ID', guestId);
          }
        }
        
        // Загружаем обычные данные пользователя
        await refreshUserData();
        
        // Проверяем и восстанавливаем ref_code для существующих пользователей
        if (state.userId && !state.refCode) {
          console.log('[UserContext] Пользователь без ref_code, восстанавливаем...');
          try {
            const recoveryResponse = await fetch('/api/v2/users/recover-ref-code', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('unifarm_auth_token')}`
              }
            }).then(res => res.json());

            if (recoveryResponse.success && recoveryResponse.ref_code) {
              console.log('[UserContext] Ref_code восстановлен:', recoveryResponse.ref_code);
              
              // Обновляем состояние пользователя
              dispatch({
                type: 'SET_USER_DATA',
                payload: {
                  refCode: recoveryResponse.ref_code
                }
              });
              
              // Обновляем localStorage
              const userData = JSON.parse(localStorage.getItem('unifarm_user_data') || '{}');
              userData.ref_code = recoveryResponse.ref_code;
              localStorage.setItem('unifarm_user_data', JSON.stringify(userData));
            }
          } catch (recoveryError) {
            console.log('[UserContext] Ошибка восстановления ref_code:', recoveryError);
          }
        }
        
        // Затем, если получили userId, запрашиваем баланс
        if (state.userId) {
          await refreshBalance();
        }
      } catch (err) {
        console.log('[UserContext] Ошибка при загрузке данных:', err);
      }
    };
    
    loadInitialUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [/* Пустой массив зависимостей, чтобы эффект выполнился только при первом рендере */]);
  
  // Значение контекста
  const value: UserContextType = {
    // Данные пользователя
    userId: state.userId,
    username: state.username,
    telegramId: state.telegramId,
    refCode: state.refCode,
    
    // Данные баланса
    uniBalance: state.balanceState.uniBalance,
    tonBalance: state.balanceState.tonBalance,
    uniFarmingActive: state.balanceState.uniFarmingActive,
    uniDepositAmount: state.balanceState.uniDepositAmount,
    uniFarmingBalance: state.balanceState.uniFarmingBalance,
    
    // Данные кошелька
    isWalletConnected: state.walletConnected,
    walletAddress: state.walletAddress,
    
    // Функции
    connectWallet,
    disconnectWallet,
    refreshBalance,
    refreshUserData,
    
    // Состояния
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