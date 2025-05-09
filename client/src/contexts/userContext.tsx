import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { fetchBalance, type Balance } from '@/services/balanceService';
import { TonConnectUI } from '@tonconnect/ui-react';
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
  
  // Используем useRef для отслеживания состояния обновления
  const processingUserDataRef = useRef<boolean>(false);
  const processingBalanceRef = useRef<boolean>(false);
  const refreshInProgressRef = useRef<boolean>(false);
  
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
    data: userData = { success: false },
    isFetching,
    refetch: refetchUserData
  } = useQuery<ApiResponse>({
    queryKey: ['/api/me'],
    retry: 3,
    staleTime: 0, // Отключаем кеширование данных пользователя
  });
  
  // Запрос баланса
  const {
    data: balanceData = { success: false },
    isFetching: isBalanceFetching,
    refetch: refetchBalance
  } = useQuery<ApiResponse>({
    queryKey: ['/api/wallet/balance', userId],
    enabled: userId !== null, // Запрос активен только если есть userId
    refetchInterval: 10000, // Обновление каждые 10 секунд
    refetchOnWindowFocus: false, // Отключаем обновление при фокусе окна
    retry: false, // Отключаем повторные попытки при ошибке
    retryOnMount: false, // Отключаем повторные попытки при монтировании
  });

  // Обновление данных пользователя при изменении userData с защитой от ошибок
  useEffect(() => {
    // Если уже обрабатываем данные пользователя, пропускаем этот цикл
    if (processingUserDataRef.current) {
      return;
    }
    
    // Устанавливаем флаг обработки
    processingUserDataRef.current = true;
    
    try {
      // Защищенная проверка структуры ответа API
      if (!userData) {
        console.warn('[UserContext] Данные пользователя отсутствуют (userData is null/undefined)');
        processingUserDataRef.current = false;
        return;
      }
      
      // Проверка успешности ответа
      if (userData.success === true && userData.data) {
        try {
          const user = userData.data;
          
          // Проверка целостности данных пользователя перед установкой
          if (typeof user !== 'object') {
            console.error('[UserContext] Неверный формат данных пользователя:', user);
            setError(new Error('Неверный формат данных пользователя'));
            return;
          }
          
          // Безопасная установка основных данных пользователя с проверкой типов
          // ID - проверяем, что это число
          const id = typeof user.id === 'number' ? user.id : 
                    (typeof user.id === 'string' && !isNaN(parseInt(user.id))) ? parseInt(user.id) : null;
          setUserId(id);
          
          // Username - проверяем, что это строка
          const username = typeof user.username === 'string' ? user.username : 
                         (user.username !== null && user.username !== undefined) ? String(user.username) : null;
          setUsername(username);
          
          // Guest ID - проверяем, что это строка
          const guestId = typeof user.guest_id === 'string' ? user.guest_id : 
                        (user.guest_id !== null && user.guest_id !== undefined) ? String(user.guest_id) : null;
          setGuestId(guestId);
          
          // Telegram ID - проверяем, что это число
          const telegramId = typeof user.telegram_id === 'number' ? user.telegram_id : 
                           (typeof user.telegram_id === 'string' && !isNaN(parseInt(user.telegram_id))) ? 
                           parseInt(user.telegram_id) : null;
          setTelegramId(telegramId);
          
          // Ref Code - проверяем, что это строка
          const refCode = typeof user.ref_code === 'string' ? user.ref_code : 
                        (user.ref_code !== null && user.ref_code !== undefined) ? String(user.ref_code) : null;
          setRefCode(refCode);
          
          // Логируем обновленные данные с минимизацией ошибок
          try {
            console.log('[UserContext] Данные пользователя обновлены:', {
              id: id,
              username: username,
              guest_id: guestId,
              telegram_id: telegramId,
              ref_code: refCode
            });
          } catch (logError) {
            console.error('[UserContext] Ошибка при логировании данных пользователя:', logError);
          }
        } catch (dataError) {
          console.error('[UserContext] Ошибка при обработке данных пользователя:', dataError);
          setError(dataError instanceof Error ? dataError : new Error('Ошибка при обработке данных пользователя'));
        }
      } else if (userData.success === false) {
        // Обрабатываем явную ошибку API
        const errorMessage = userData.error || userData.message || 'Ошибка получения данных пользователя';
        console.error('[UserContext] Ошибка получения данных пользователя:', errorMessage);
        setError(new Error(errorMessage));
      } else {
        // Неизвестный формат ответа
        console.warn('[UserContext] Неопределенный формат ответа API:', userData);
      }
    } catch (criticalError) {
      // Обрабатываем критические ошибки в самом обработчике эффекта
      console.error('[UserContext] Критическая ошибка при обновлении данных пользователя:', criticalError);
      try {
        setError(criticalError instanceof Error ? criticalError : new Error('Критическая ошибка при обновлении данных пользователя'));
      } catch (stateError) {
        console.error('[UserContext] Ошибка при установке состояния ошибки:', stateError);
      }
    } finally {
      // Сбрасываем флаг обработки вне зависимости от результата
      processingUserDataRef.current = false;
    }
  }, [userData]);

  // Обновление баланса при изменении balanceData с расширенной защитой от ошибок
  useEffect(() => {
    // Если уже обрабатываем данные баланса, пропускаем этот цикл
    if (processingBalanceRef.current) {
      return;
    }
    
    // Устанавливаем флаг обработки
    processingBalanceRef.current = true;
    
    try {
      // Защищенная проверка структуры ответа API
      if (!balanceData) {
        console.warn('[UserContext] Данные баланса отсутствуют (balanceData is null/undefined)');
        processingBalanceRef.current = false;
        return;
      }
      
      // Проверка успешности ответа
      if (balanceData.success === true && balanceData.data) {
        try {
          const data = balanceData.data;
          
          // Проверка целостности данных баланса перед обработкой
          if (typeof data !== 'object') {
            console.error('[UserContext] Неверный формат данных баланса:', data);
            setError(new Error('Неверный формат данных баланса'));
            return;
          }
          
          // Безопасное преобразование значений баланса с проверкой типов и защитой от NaN
          const safeParseFloat = (value: any, defaultValue: number = 0): number => {
            try {
              // Если значение уже число, возвращаем его
              if (typeof value === 'number' && !isNaN(value)) {
                return value;
              }
              
              // Если значение строка, преобразуем в число
              if (typeof value === 'string') {
                const parsed = parseFloat(value);
                return !isNaN(parsed) ? parsed : defaultValue;
              }
              
              // Для других типов возвращаем значение по умолчанию
              return defaultValue;
            } catch (parseError) {
              console.warn('[UserContext] Ошибка при преобразовании значения баланса:', parseError);
              return defaultValue;
            }
          };
          
          // Безопасное преобразование boolean значений
          const safeBooleanConvert = (value: any): boolean => {
            try {
              if (typeof value === 'boolean') {
                return value;
              }
              
              if (typeof value === 'number') {
                return value !== 0;
              }
              
              if (typeof value === 'string') {
                return value.toLowerCase() === 'true' || value === '1';
              }
              
              return !!value;
            } catch (boolError) {
              console.warn('[UserContext] Ошибка при преобразовании boolean значения:', boolError);
              return false;
            }
          };
          
          // Создаем объект баланса с безопасным доступом к свойствам
          const balanceInfo: Balance = {
            uniBalance: safeParseFloat(data.balance_uni),
            tonBalance: safeParseFloat(data.balance_ton),
            uniFarmingActive: safeBooleanConvert(data.uni_farming_active),
            uniDepositAmount: safeParseFloat(data.uni_deposit_amount),
            uniFarmingBalance: safeParseFloat(data.uni_farming_balance)
          };
          
          // Проверка на отрицательные значения (защита от некорректных данных)
          const sanitizedBalance: Balance = {
            uniBalance: Math.max(0, balanceInfo.uniBalance),
            tonBalance: Math.max(0, balanceInfo.tonBalance),
            uniFarmingActive: balanceInfo.uniFarmingActive,
            uniDepositAmount: Math.max(0, balanceInfo.uniDepositAmount),
            uniFarmingBalance: Math.max(0, balanceInfo.uniFarmingBalance)
          };
          
          // Обновляем состояние баланса
          setBalance(sanitizedBalance);
          
          // Логируем обновленные данные с минимизацией ошибок
          try {
            console.log('[UserContext] Баланс обновлен:', sanitizedBalance);
          } catch (logError) {
            console.error('[UserContext] Ошибка при логировании данных баланса:', logError);
          }
        } catch (dataError) {
          console.error('[UserContext] Ошибка при обработке данных баланса:', dataError);
          
          // В случае ошибки при обработке данных, сохраняем нулевые значения баланса
          // для предотвращения отображения некорректных данных
          try {
            setBalance({
              uniBalance: 0,
              tonBalance: 0,
              uniFarmingActive: false,
              uniDepositAmount: 0,
              uniFarmingBalance: 0
            });
          } catch {}
          
          setError(dataError instanceof Error ? dataError : new Error('Ошибка при обработке данных баланса'));
        }
      } else if (balanceData.success === false) {
        // Обрабатываем явную ошибку API
        const errorMessage = balanceData.error || balanceData.message || 'Ошибка получения баланса';
        console.error('[UserContext] Ошибка получения баланса:', errorMessage);
        setError(new Error(errorMessage));
      } else {
        // Неизвестный формат ответа
        console.warn('[UserContext] Неопределенный формат ответа API для баланса:', balanceData);
      }
    } catch (criticalError) {
      // Обрабатываем критические ошибки в самом обработчике эффекта
      console.error('[UserContext] Критическая ошибка при обновлении баланса:', criticalError);
      try {
        setError(criticalError instanceof Error ? criticalError : new Error('Критическая ошибка при обновлении баланса'));
      } catch (stateError) {
        console.error('[UserContext] Ошибка при установке состояния ошибки баланса:', stateError);
      }
    } finally {
      // Сбрасываем флаг обработки вне зависимости от результата
      processingBalanceRef.current = false;
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

  // Функция для подключения TON-кошелька с улучшенной обработкой ошибок
  const connectWallet = useCallback(async (): Promise<boolean> => {
    try {
      // Проверка наличия tonConnectUI
      if (!tonConnectUI) {
        console.error('[UserContext] Ошибка при подключении кошелька: tonConnectUI не инициализирован');
        setError(new Error('Telegram TON Connect не инициализирован. Пожалуйста, обновите страницу.'));
        return false;
      }
      
      // Проверка текущего состояния подключения
      const isAlreadyConnected = isWalletConnected(tonConnectUI);
      if (isAlreadyConnected) {
        console.log('[UserContext] Кошелек уже подключен. Пропускаем подключение.');
        return true;
      }
      
      console.log('[UserContext] Начинаем подключение TON-кошелька...');
      
      // Пытаемся подключить кошелек с таймаутом и защитой от зависания
      let connectionTimedOut = false;
      const timeoutId = setTimeout(() => {
        connectionTimedOut = true;
        console.error('[UserContext] Таймаут подключения кошелька (15 секунд)');
        setError(new Error('Время подключения кошелька истекло. Пожалуйста, попробуйте снова.'));
      }, 15000); // 15 секунд таймаут
      
      let result = false;
      try {
        result = await connectTonWallet(tonConnectUI);
        clearTimeout(timeoutId);
        
        if (connectionTimedOut) {
          console.warn('[UserContext] Подключение произошло после таймаута');
          return false;
        }
      } catch (connectError) {
        clearTimeout(timeoutId);
        console.error('[UserContext] Ошибка в connectTonWallet:', connectError);
        throw connectError; // Пробрасываем для обработки в основном catch блоке
      }
      
      console.log('[UserContext] Результат подключения кошелька:', result);
      
      if (result) {
        try {
          // При успешном подключении обновляем адрес и сохраняем его на сервере
          const address = getWalletAddress(tonConnectUI);
          
          if (!address) {
            console.warn('[UserContext] Кошелек подключен, но адрес не получен');
            setError(new Error('Не удалось получить адрес кошелька'));
            return true; // Возвращаем true, так как кошелек подключен, но без адреса
          }
          
          if (!userId) {
            console.warn('[UserContext] Нет userId для сохранения адреса кошелька');
            return true; // Возвращаем true, так как кошелек подключен, но не можем сохранить адрес
          }
          
          try {
            // Вызываем API для сохранения адреса кошелька
            console.log('[UserContext] Сохраняем адрес кошелька на сервере:', { userId, address });
            
            const response = await correctApiRequest('/api/wallet/connect', 'POST', {
              user_id: userId,
              wallet_address: address
            });
            
            console.log('[UserContext] Результат сохранения адреса кошелька:', response);
          } catch (apiError) {
            console.error('[UserContext] Ошибка при сохранении адреса кошелька:', apiError);
            // Мы не выбрасываем ошибку, так как кошелек уже подключен
          }
          
          // Обновляем данные после подключения с защитой от ошибок
          try {
            refetchUserData();
          } catch (refetchUserError) {
            console.error('[UserContext] Ошибка при обновлении данных пользователя после подключения кошелька:', refetchUserError);
          }
          
          try {
            refetchBalance();
          } catch (refetchBalanceError) {
            console.error('[UserContext] Ошибка при обновлении баланса после подключения кошелька:', refetchBalanceError);
          }
        } catch (postConnectError) {
          console.error('[UserContext] Ошибка после подключения кошелька:', postConnectError);
          // Не прерываем выполнение, так как кошелек уже подключен
        }
      }
      
      return result;
    } catch (err) {
      console.error('[UserContext] Критическая ошибка при подключении кошелька:', err);
      
      // Пытаемся определить тип ошибки для лучшего сообщения пользователю
      let errorMessage = 'Ошибка при подключении кошелька';
      
      if (err instanceof Error) {
        if (err.message.includes('timeout') || err.message.includes('timed out')) {
          errorMessage = 'Время подключения кошелька истекло. Пожалуйста, попробуйте снова.';
        } else if (err.message.includes('rejected') || err.message.includes('отклонено')) {
          errorMessage = 'Подключение кошелька было отклонено. Пожалуйста, разрешите подключение в приложении TON.';
        } else if (err.message.includes('not installed') || err.message.includes('не найдено')) {
          errorMessage = 'Приложение TON не установлено или не найдено. Пожалуйста, установите приложение TON.';
        }
      }
      
      // Безопасно устанавливаем состояние ошибки
      try {
        setError(err instanceof Error ? err : new Error(errorMessage));
      } catch (setErrorErr) {
        console.error('[UserContext] Ошибка при установке состояния ошибки:', setErrorErr);
      }
      
      return false;
    }
  }, [tonConnectUI, userId, refetchUserData, refetchBalance]);

  // Функция для отключения TON-кошелька с улучшенной обработкой ошибок
  const disconnectWallet = useCallback(async (): Promise<void> => {
    try {
      // Проверка наличия tonConnectUI
      if (!tonConnectUI) {
        console.error('[UserContext] Ошибка при отключении кошелька: tonConnectUI не инициализирован');
        setError(new Error('Telegram TON Connect не инициализирован. Пожалуйста, обновите страницу.'));
        return;
      }
      
      // Проверка текущего состояния подключения
      const isCurrentlyConnected = isWalletConnected(tonConnectUI);
      if (!isCurrentlyConnected) {
        console.log('[UserContext] Кошелек уже отключен. Пропускаем отключение.');
        return;
      }
      
      console.log('[UserContext] Начинаем отключение TON-кошелька...');
      
      // Пытаемся отключить кошелек с таймаутом
      const disconnectPromise = disconnectTonWallet(tonConnectUI);
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000); // 5 секунд таймаут
      });
      
      try {
        await Promise.race([disconnectPromise, timeoutPromise]);
        console.log('[UserContext] Кошелек успешно отключен');
      } catch (disconnectError) {
        if (disconnectError instanceof Error && disconnectError.message === 'Timeout') {
          console.error('[UserContext] Таймаут отключения кошелька');
          setError(new Error('Время отключения кошелька истекло. Кошелек может быть всё еще подключен.'));
        } else {
          console.error('[UserContext] Ошибка при отключении кошелька:', disconnectError);
          throw disconnectError; // Пробрасываем для обработки в основном catch блоке
        }
      }
      
      // Вызываем API для отключения кошелька с сервера, даже если локальное отключение не удалось
      if (userId) {
        try {
          console.log('[UserContext] Отключаем кошелек на сервере для пользователя:', userId);
          
          const response = await correctApiRequest('/api/wallet/disconnect', 'POST', {
            user_id: userId
          });
          
          console.log('[UserContext] Результат отключения кошелька на сервере:', response);
        } catch (apiError) {
          console.error('[UserContext] Ошибка при отключении кошелька на сервере:', apiError);
          // Не прерываем выполнение, так как это некритическая ошибка
        }
        
        // Обновляем данные пользователя после отключения с защитой от ошибок
        try {
          refetchUserData();
        } catch (refetchError) {
          console.error('[UserContext] Ошибка при обновлении данных после отключения кошелька:', refetchError);
        }
      } else {
        console.warn('[UserContext] Нет userId для отключения кошелька на сервере');
      }
    } catch (err) {
      console.error('[UserContext] Критическая ошибка при отключении кошелька:', err);
      
      // Безопасно устанавливаем состояние ошибки
      try {
        setError(err instanceof Error ? err : new Error('Ошибка при отключении кошелька'));
      } catch (setErrorErr) {
        console.error('[UserContext] Ошибка при установке состояния ошибки:', setErrorErr);
      }
    }
  }, [tonConnectUI, userId, refetchUserData]);

  // Функция для принудительного обновления баланса с защитой от ошибок
  const refreshBalance = useCallback(() => {
    // Проверяем, не выполняется ли уже обновление
    if (refreshInProgressRef.current) {
      console.log('[UserContext] Уже выполняется другое обновление. Пропускаем запрос.');
      return;
    }
    
    try {
      if (!userId) {
        console.warn('[UserContext] Невозможно обновить баланс: userId отсутствует');
        return;
      }
      
      if (isBalanceFetching) {
        console.log('[UserContext] Обновление баланса уже выполняется. Пропускаем запрос.');
        return;
      }
      
      // Устанавливаем флаг, что обновление в процессе
      refreshInProgressRef.current = true;
      console.log('[UserContext] Запрошено обновление баланса для пользователя:', userId);
      
      try {
        refetchBalance();
      } catch (refetchError) {
        console.error('[UserContext] Ошибка при вызове refetchBalance:', refetchError);
        setError(new Error('Не удалось обновить баланс. Пожалуйста, попробуйте позже.'));
      }
    } catch (criticalError) {
      console.error('[UserContext] Критическая ошибка при обновлении баланса:', criticalError);
      try {
        setError(criticalError instanceof Error ? criticalError : new Error('Критическая ошибка при обновлении баланса'));
      } catch {}
    } finally {
      // Сбрасываем флаг в любом случае через небольшую задержку
      setTimeout(() => {
        refreshInProgressRef.current = false;
      }, 100);
    }
  }, [userId, refetchBalance, isBalanceFetching]);

  // Функция для принудительного обновления данных пользователя с защитой от ошибок
  const refreshUserData = useCallback(() => {
    // Проверяем, не выполняется ли уже обновление
    if (refreshInProgressRef.current) {
      console.log('[UserContext] Уже выполняется другое обновление. Пропускаем запрос.');
      return;
    }
    
    try {
      if (isFetching) {
        console.log('[UserContext] Обновление данных пользователя уже выполняется. Пропускаем запрос.');
        return;
      }
      
      // Устанавливаем флаг, что обновление в процессе
      refreshInProgressRef.current = true;
      console.log('[UserContext] Запрошено обновление данных пользователя');
      
      try {
        refetchUserData();
      } catch (refetchError) {
        console.error('[UserContext] Ошибка при вызове refetchUserData:', refetchError);
        setError(new Error('Не удалось обновить данные пользователя. Пожалуйста, попробуйте позже.'));
      }
    } catch (criticalError) {
      console.error('[UserContext] Критическая ошибка при обновлении данных пользователя:', criticalError);
      try {
        setError(criticalError instanceof Error ? criticalError : new Error('Критическая ошибка при обновлении данных пользователя'));
      } catch {}
    } finally {
      // Сбрасываем флаг в любом случае через небольшую задержку
      setTimeout(() => {
        refreshInProgressRef.current = false;
      }, 100);
    }
  }, [refetchUserData, isFetching]);

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