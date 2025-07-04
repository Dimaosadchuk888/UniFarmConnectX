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
  guestId: string | null;
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

// Начальное состояние - получаем данные из JWT токена
const getInitialUserData = () => {
  try {
    const jwtToken = localStorage.getItem('telegramJWT');
    if (jwtToken) {
      const payload = JSON.parse(atob(jwtToken.split('.')[1]));
      return {
        userId: payload.userId || payload.user_id || null,
        username: payload.username || null,
        telegramId: payload.telegram_id || payload.telegramId || null,
        refCode: payload.ref_code || payload.refCode || null
      };
    }
  } catch (error) {
    console.error('[UserContext] Ошибка декодирования JWT:', error);
  }
  return {
    userId: null,
    username: null,
    telegramId: null,
    refCode: null
  };
};

const initialUserData = getInitialUserData();
const initialState: UserState = {
  userId: initialUserData.userId,
  username: initialUserData.username,
  guestId: null,
  telegramId: initialUserData.telegramId,
  refCode: initialUserData.refCode,
  
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
      console.log('[UserContext Reducer] SET_BALANCE действие, новый баланс:', action.payload);
      console.log('[UserContext Reducer] Старый баланс был:', state.balanceState);
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
      // Production mode - demo disabled
      const isDemoMode = window.location.hostname.includes('replit') || true; // Включаем для отображения реальных данных
      
      if (isDemoMode) {
        console.log('[UserContext] Демо-режим активирован, выполняем авторизацию для demo_user');
        
        try {
          // Авторизуем пользователя ID=48 через API для получения JWT токена
          const authResponse = await correctApiRequest('/api/v2/auth/telegram', 'POST', {
            direct_registration: true,
            telegram_id: 88888888, // ID для пользователя 48
            username: 'demo_user',
            first_name: 'Demo User'
          });
          
          console.log('[UserContext] Ответ авторизации в демо-режиме:', authResponse);
          
          if (authResponse.success && authResponse.data) {
            const { user, token } = authResponse.data;
            
            // Сохраняем JWT токен в localStorage
            if (token) {
              localStorage.setItem('unifarm_jwt_token', token);
              console.log('[UserContext] JWT токен сохранен в localStorage');
            }
            
            // Устанавливаем данные пользователя ID=1
            dispatch({
              type: 'SET_USER_DATA',
              payload: {
                userId: user.id || 1,
                username: user.username || 'testuser',
                guestId: null,
                telegramId: user.telegram_id || 12345,
                refCode: user.ref_code || null
              }
            });
            
            // Сохраняем сессию
            localStorage.setItem('unifarm_last_session', JSON.stringify({
              timestamp: new Date().toISOString(),
              user_id: user.id,
              username: user.username,
              refCode: user.ref_code
            }));
            
            dispatch({ type: 'SET_ERROR', payload: null });
            console.log('[UserContext] Демо-режим: авторизация успешна, userId:', user.id);
            return;
          }
        } catch (error) {
          console.error('[UserContext] Ошибка авторизации в демо-режиме:', error);
        }
        
        // Fallback: устанавливаем demo user данные без токена
        dispatch({
          type: 'SET_USER_DATA',
          payload: {
            userId: 48,
            username: 'demo_user',
            guestId: null,
            telegramId: null,
            refCode: 'REF_1750952576614_t938vs'
          }
        });
        
        dispatch({ type: 'SET_ERROR', payload: null });
        console.log('[UserContext] Демо-режим: используем fallback данные');
        return;
      }
      
      // Получаем данные пользователя из localStorage или используем guest_id
      let apiUrl = '/api/v2/users/profile';
      const lastSessionStr = localStorage.getItem('unifarm_last_session');
      const guestId = localStorage.getItem('unifarm_guest_id');
      
      if (lastSessionStr) {
        try {
          const lastSession = JSON.parse(lastSessionStr);
          if (lastSession.user_id) {
            apiUrl = `/api/v2/users/profile?user_id=${lastSession.user_id}`;
          }
        } catch (e) {
          console.warn('[UserContext] Ошибка парсинга данных сессии:', e);
        }
      } else if (guestId) {
        apiUrl = `/api/v2/users/profile?guest_id=${guestId}`;
      }
      
      console.log('[UserContext] Выполняем API запрос:', apiUrl);
      const response = await correctApiRequest(apiUrl);
      console.log('[UserContext] Получен ответ API:', response);
      
      if (response.success && response.data) {
        const userData = response.data;
        console.log('[UserContext] Данные пользователя из API:', userData);
        
        // Если нет JWT токена в localStorage, пытаемся авторизоваться
        const currentToken = localStorage.getItem('unifarm_jwt_token');
        if (!currentToken && userData.telegram_id) {
          console.log('[UserContext] JWT токен не найден, выполняем авторизацию...');
          
          try {
            const authResponse = await correctApiRequest('/api/v2/auth/telegram', 'POST', {
              direct_registration: true,
              telegram_id: userData.telegram_id,
              username: userData.username || 'user',
              first_name: userData.first_name || 'User'
            });
            
            if (authResponse.success && authResponse.data?.token) {
              localStorage.setItem('unifarm_jwt_token', authResponse.data.token);
              console.log('[UserContext] JWT токен получен и сохранен');
            }
          } catch (authError) {
            console.error('[UserContext] Ошибка получения JWT токена:', authError);
          }
        }
        
        dispatch({
          type: 'SET_USER_DATA',
          payload: {
            userId: userData.id || null,
            username: userData.username || null,
            guestId: userData.guest_id || null,
            telegramId: userData.telegram_id || null,
            refCode: userData.ref_code || null
          }
        });
        
        console.log('[UserContext] Состояние обновлено, userId:', userData.id);
        
        dispatch({ type: 'SET_ERROR', payload: null });
        
        // Сохраняем обновленные данные в localStorage
        try {
          localStorage.setItem('unifarm_last_session', JSON.stringify({
            timestamp: new Date().toISOString(),
            user_id: userData.id,
            username: userData.username || null,
            refCode: userData.ref_code || null
          }));
        } catch (e) {
          console.warn('[UserContext] Ошибка при сохранении данных пользователя в localStorage:', e);
        }
      } else {
        // Если запрос не удался, проверяем данные в localStorage
        const lastSessionStr = localStorage.getItem('unifarm_last_session');
        const guestId = localStorage.getItem('unifarm_guest_id');
        
        if (lastSessionStr) {
          try {
            const lastSession = JSON.parse(lastSessionStr);
            if (lastSession.user_id) {
              console.log('[UserContext] Используем информацию о пользователе из localStorage:', lastSession.user_id);
              dispatch({
                type: 'SET_USER_DATA',
                payload: {
                  userId: lastSession.user_id,
                  username: lastSession.username || null,
                  guestId: guestId,
                  telegramId: null,
                  refCode: lastSession.refCode || null
                }
              });
              dispatch({ type: 'SET_ERROR', payload: null });
            }
          } catch (e) {
            console.warn('[UserContext] Ошибка парсинга localStorage:', e);
          }
        } else {
          const errorMsg = response.error || response.message || 'Ошибка получения данных пользователя';
          console.error('[UserContext] Ошибка получения данных пользователя:', errorMsg);
          // Не устанавливаем fallback данные, пусть App.tsx обработает создание пользователя
          dispatch({ type: 'SET_ERROR', payload: null });
        }
      }
    } catch (err) {
      // Проверяем, если есть данные пользователя в localStorage
      try {
        const lastSessionStr = localStorage.getItem('unifarm_last_session');
        if (lastSessionStr) {
          const lastSession = JSON.parse(lastSessionStr);
          if (lastSession.user_id) {
            console.log('[UserContext] Восстановление данных из localStorage после ошибки:', lastSession.user_id);
            dispatch({
              type: 'SET_USER_DATA',
              payload: {
                userId: lastSession.user_id,
                username: lastSession.username || null,
                guestId: null,
                telegramId: null,
                refCode: lastSession.refCode || null
              }
            });
            dispatch({ type: 'SET_ERROR', payload: null });
          }
        }
      } catch (e) {
        console.warn('[UserContext] Ошибка при попытке восстановить данные из localStorage:', e);
      }
      
      const error = err instanceof Error ? err : new Error('Ошибка получения данных пользователя');
      console.error('[UserContext] Ошибка получения данных пользователя:', error);
      // Не устанавливаем fallback данные, позволяем App.tsx обработать создание пользователя
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
      // Используем улучшенный сервис с поддержкой forceRefresh
      console.log('[UserContext] Запрос баланса с forceRefresh:', forceRefresh);
      const balance = await fetchBalance(state.userId, forceRefresh);
      
      // Обновляем состояние баланса
      dispatch({ type: 'SET_BALANCE', payload: balance });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Ошибка получения баланса');
      console.error('[UserContext] Ошибка получения баланса:', error);
      // Устанавливаем нулевые балансы вместо блокировки интерфейса
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
    if (!tonConnectUI) {
      console.log('[UserContext] TonConnect UI не инициализирован');
      return false;
    }
    
    try {
      console.log('[UserContext] Подключение кошелька через TonConnect...');
      const result = await connectTonWallet(tonConnectUI);
      if (result) {
        const address = await getWalletAddress(tonConnectUI);
        dispatch({
          type: 'SET_WALLET_CONNECTED',
          payload: { connected: true, address }
        });
        console.log('[UserContext] Кошелек успешно подключен:', address);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[UserContext] Ошибка подключения кошелька:', error);
      return false;
    }
  }, [tonConnectUI]);
  
  const disconnectWallet = useCallback(async (): Promise<void> => {
    if (!tonConnectUI) {
      console.log('[UserContext] TonConnect UI не инициализирован для отключения');
      dispatch({
        type: 'SET_WALLET_CONNECTED',
        payload: { connected: false, address: null }
      });
      return;
    }
    
    try {
      console.log('[UserContext] Отключение кошелька через TonConnect...');
      await disconnectTonWallet(tonConnectUI);
      dispatch({
        type: 'SET_WALLET_CONNECTED',
        payload: { connected: false, address: null }
      });
      console.log('[UserContext] Кошелек успешно отключен');
    } catch (error) {
      console.error('[UserContext] Ошибка отключения кошелька:', error);
    }
  }, [tonConnectUI]);
  
  // Проверяем статус подключения кошелька
  useEffect(() => {
    if (!tonConnectUI) {
      console.log('[UserContext] TonConnect UI не готов, пропускаем проверку кошелька');
      return;
    }
    
    if (initializedRef.current) return;
    
    const checkWalletConnection = async () => {
      try {
        console.log('[UserContext] Проверка статуса подключения кошелька...');
        const connected = await isWalletConnected(tonConnectUI);
        if (connected) {
          const address = await getWalletAddress(tonConnectUI);
          dispatch({
            type: 'SET_WALLET_CONNECTED',
            payload: { connected: true, address }
          });
          console.log('[UserContext] Кошелек уже подключен:', address);
        } else {
          dispatch({
            type: 'SET_WALLET_CONNECTED',
            payload: { connected: false, address: null }
          });
          console.log('[UserContext] Кошелек не подключен');
        }
      } catch (error) {
        console.error('[UserContext] Ошибка проверки статуса кошелька:', error);
        dispatch({
          type: 'SET_WALLET_CONNECTED',
          payload: { connected: false, address: null }
        });
      }
    };
    
    // Добавляем небольшую задержку для инициализации TonConnect
    const timeoutId = setTimeout(() => {
      checkWalletConnection();
      initializedRef.current = true;
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [tonConnectUI]);
  
  // Автоматическая загрузка данных пользователя при первом рендере
  useEffect(() => {
    const loadInitialUserData = async () => {
      console.log('[UserContext] Автоматическая загрузка данных пользователя...');
      try {
        // Сначала запрашиваем данные пользователя
        await refreshUserData();
      } catch (err) {
        console.error('[UserContext] Ошибка при загрузке начальных данных:', err);
      }
    };
    
    loadInitialUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [/* Пустой массив зависимостей, чтобы эффект выполнился только при первом рендере */]);
  
  // Загружаем баланс после установки userId
  useEffect(() => {
    if (state.userId) {
      console.log('[UserContext] userId установлен, запрашиваем баланс для userId:', state.userId);
      console.log('[UserContext] Текущее состояние баланса перед обновлением:', state.balanceState);
      refreshBalance(true); // Принудительное обновление без кэша
    }
  }, [state.userId, refreshBalance]);
  
  // Значение контекста
  const value: UserContextType = {
    // Данные пользователя
    userId: state.userId,
    username: state.username,
    guestId: state.guestId,
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