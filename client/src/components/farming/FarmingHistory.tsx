import React, { useState, useEffect } from 'react';
import { BOOST_PACKAGES } from '@/lib/constants';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { correctApiRequest } from '@/lib/correctApiRequest';

// Интерфейс для фарминг-депозита
interface FarmingDeposit {
  id: number;
  packageId: number;
  createdAt: Date;
  isActive: boolean;
  uniYield: string;
  tonYield: string;
  bonus: string;
  amount?: string; // Сумма депозита/транзакции
  daysLeft: number;
}

// Интерфейс для истории фарминга
interface FarmingHistory {
  id: number;
  time: Date;
  type: string;
  amount: number;
  currency: string;
  boost_id?: number;
  isNew?: boolean;
}

// Интерфейс для API-ответа
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// Интерфейс для TON Boost
interface TonBoostDeposit {
  id: number;
  user_id: number;
  boost_package_id: number;
  created_at: string;
  amount: string;
  days_left: number;
  rate_ton_per_second: string;
  bonus_uni: string;
  is_active: boolean;
  payment_method?: string;
  payment_status?: string;
}

// Интерфейс для транзакции
interface Transaction {
  id: number;
  user_id: number;
  type: string;
  created_at: string;
  amount: string;
  boost_id?: number;
  currency?: string;
  status?: string;
}

// Интерфейс для пропсов компонента
interface FarmingHistoryProps {
  userId: number;
}

// Основной компонент истории фарминга
const FarmingHistory: React.FC<FarmingHistoryProps> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState('uni');  // 'uni' или 'ton'
  const [farmingHistory, setFarmingHistory] = useState<FarmingHistory[]>([]);
  const [deposits, setDeposits] = useState<FarmingDeposit[]>([]);
  const [opacity, setOpacity] = useState(0);
  const [translateY, setTranslateY] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  
  // Убеждаемся, что userId определен
  const validUserId = userId || 1; // Используем 1 как фолбэк значение, если userId не передан
  
  // Запрос на получение транзакций с усиленной обработкой ошибок
  const { data: transactionsResponse, refetch: refetchTransactions } = useQuery({
    queryKey: ['/api/transactions', { user_id: validUserId }],
    queryFn: async () => {
      try {
        // Проверка наличия userId перед запросом
        if (!validUserId) {
          console.warn("[WARNING] FarmingHistory - Попытка получить транзакции без userId");
          return { success: true, data: { transactions: [] } };
        }
        
        // Используем correctApiRequest с расширенной обработкой ошибок
        try {
          const result = await correctApiRequest<any>(`/api/transactions?user_id=${validUserId}`, 'GET');
          
          // Проверка структуры ответа на валидность
          if (!result) {
            console.error("[ERROR] FarmingHistory - Получен пустой ответ от API транзакций");
            return { success: true, data: { transactions: [] } };
          }
          
          // Логирование для отладки с защитой от ошибок
          try {
            console.log("[DEBUG] FarmingHistory - API /api/transactions response:", {
              isObject: typeof result === 'object',
              hasSuccess: result && 'success' in result,
              hasData: result && result.success && 'data' in result,
              dataStructure: result && result.success && result.data ? 
                Object.keys(result.data) : 'N/A',
              sample: result && result.success && result.data && result.data.transactions ?
                result.data.transactions.slice(0, 2) : 'N/A'
            });
          } catch (logError) {
            console.error("[ERROR] FarmingHistory - Ошибка при логировании ответа транзакций:", logError);
          }
          
          // Валидация структуры данных
          if (result && typeof result === 'object') {
            if (!('success' in result)) {
              console.warn("[WARNING] FarmingHistory - Ответ API не содержит поле success");
              // Корректируем структуру данных для совместимости
              return { success: true, data: { transactions: Array.isArray(result) ? result : [] } };
            }
            
            if (result.success && !('data' in result)) {
              console.warn("[WARNING] FarmingHistory - Ответ API успешен, но не содержит поля data");
              return { success: true, data: { transactions: [] } };
            }
            
            // Проверка наличия транзакций
            if (result.success && result.data) {
              if (!('transactions' in result.data)) {
                console.warn("[WARNING] FarmingHistory - Поле data не содержит transactions");
                
                // Пытаемся адаптировать данные к ожидаемой структуре
                if (Array.isArray(result.data)) {
                  return { success: true, data: { transactions: result.data } };
                }
              }
            }
            
            return result;
          } else {
            // Возвращаем безопасный объект при неверной структуре
            console.error("[ERROR] FarmingHistory - Неверная структура ответа API транзакций:", result);
            return { success: true, data: { transactions: [] } };
          }
        } catch (apiError: any) {
          console.error("[ERROR] FarmingHistory - Ошибка запроса API транзакций:", apiError);
          // При любой ошибке API возвращаем безопасную структуру
          return { success: true, data: { transactions: [] } };
        }
      } catch (generalError: any) {
        console.error("[ERROR] FarmingHistory - Критическая ошибка получения транзакций:", generalError);
        // Не выбрасываем исключение, чтобы не ломать UI
        return { success: true, data: { transactions: [] } };
      }
    },
    enabled: !!validUserId, // Выполняем запрос только если userId определен
    retry: 2, // Увеличиваем количество повторных попыток при ошибке
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Экспоненциальное откладывание до 10 секунд
  });
  
  // Запрос на получение активных буст-пакетов UNI
  const { data: activeBoostsResponse, refetch: refetchBoosts } = useQuery<ApiResponse<{
    boost_id: number;
    created_at: string;
    days_left: number;
  }[]>>({
    queryKey: ['/api/boosts/active', { user_id: validUserId }],
    queryFn: async () => {
      try {
        // Используем correctApiRequest вместо прямого fetch
        return await correctApiRequest<ApiResponse<{
          boost_id: number;
          created_at: string;
          days_left: number;
        }[]>>(`/api/boosts/active?user_id=${validUserId}`, 'GET');
      } catch (error: any) {
        console.error("[ERROR] FarmingHistory - Ошибка получения буст-пакетов:", error);
        throw new Error(`Ошибка получения буст-пакетов: ${error.message || 'Неизвестная ошибка'}`);
      }
    },
    enabled: !!validUserId,
  });
  
  // Запрос на получение активных TON Boost пакетов
  const { data: activeTonBoostsResponse, refetch: refetchTonBoosts } = useQuery<ApiResponse<TonBoostDeposit[]>>({
    queryKey: ['/api/ton-boosts/active', { user_id: validUserId }],
    queryFn: async () => {
      try {
        // Используем correctApiRequest вместо прямого fetch
        return await correctApiRequest<ApiResponse<TonBoostDeposit[]>>(`/api/ton-boosts/active?user_id=${validUserId}`, 'GET');
      } catch (error: any) {
        console.error("[ERROR] FarmingHistory - Ошибка получения TON Boost пакетов:", error);
        throw new Error(`Ошибка получения TON Boost пакетов: ${error.message || 'Неизвестная ошибка'}`);
      }
    },
    enabled: !!validUserId,
  });
  
  // Запрос информации о UNI фарминге
  const { data: uniFarmingResponse, refetch: refetchFarming } = useQuery<ApiResponse<{
    isActive: boolean;
    depositAmount: string;
    startDate: string;
    totalRatePerSecond: string;
    totalEarned: string;
    depositCount: number;
  }>>({
    queryKey: ['/api/uni-farming/info', { user_id: validUserId }],
    queryFn: async () => {
      try {
        // Используем correctApiRequest вместо прямого fetch
        return await correctApiRequest<ApiResponse<{
          isActive: boolean;
          depositAmount: string;
          startDate: string;
          totalRatePerSecond: string;
          totalEarned: string;
          depositCount: number;
        }>>(`/api/uni-farming/info?user_id=${validUserId}`, 'GET');
      } catch (error: any) {
        console.error("[ERROR] FarmingHistory - Ошибка получения информации о UNI фарминге:", error);
        throw new Error(`Ошибка получения информации о UNI фарминге: ${error.message || 'Неизвестная ошибка'}`);
      }
    },
    enabled: !!validUserId,
  });
  
  // Запрос на получение информации о TON фарминге
  const { data: tonFarmingInfo, isLoading: isLoadingTonFarming } = useQuery<ApiResponse<{
    isActive: boolean;
    totalDepositAmount: string;
    totalTonRatePerSecond: string;
    totalUniRatePerSecond: string;
    dailyIncomeTon: string;
    dailyIncomeUni: string;
    depositCount: number;
    deposits: Array<{
      id: number;
      boost_package_id: number;
      rate_ton_per_second: string;
      amount: string;
    }>;
  }>>({
    queryKey: ['/api/ton-farming/info', { user_id: validUserId }],
    queryFn: async () => {
      try {
        // Используем correctApiRequest вместо прямого fetch
        return await correctApiRequest<ApiResponse<{
          isActive: boolean;
          totalDepositAmount: string;
          totalTonRatePerSecond: string;
          totalUniRatePerSecond: string;
          dailyIncomeTon: string;
          dailyIncomeUni: string;
          depositCount: number;
          deposits: Array<{
            id: number;
            boost_package_id: number;
            rate_ton_per_second: string;
            amount: string;
          }>;
        }>>(`/api/ton-farming/info?user_id=${validUserId}`, 'GET');
      } catch (error: any) {
        console.error("[ERROR] FarmingHistory - Ошибка получения информации о TON фарминге:", error);
        throw new Error(`Ошибка получения информации о TON фарминге: ${error.message || 'Неизвестная ошибка'}`);
      }
    },
    enabled: !!validUserId,
    refetchInterval: 10000, // Обновляем каждые 10 секунд
  });
  
  // Обработка полученных данных с усиленной защитой от ошибок
  useEffect(() => {
    // Обертываем весь код в try-catch для предотвращения сбоев компонента
    try {
      // Инициализация переменных с безопасными значениями по умолчанию
      const farmingDeposits: FarmingDeposit[] = [];
      let historyItems: FarmingHistory[] = [];
      
      // Установка состояния загрузки с защитой от ошибок
      try {
        setIsLoading(true);
      } catch (stateError) {
        console.error('[ERROR] FarmingHistory - Ошибка при установке состояния isLoading:', stateError);
      }
      
      // Безопасная функция для логирования объектов без риска циклических ссылок или ошибок сериализации
      const safeLogObject = (prefix: string, obj: any) => {
        try {
          if (!obj) {
            console.log(`${prefix}: null или undefined объект`);
            return;
          }
          
          let serialized = '';
          try {
            // Ограничиваем размер логируемых данных для предотвращения переполнения консоли
            serialized = JSON.stringify(
              obj, 
              (key, value) => {
                // Защита от циклических ссылок и слишком больших строк
                if (typeof value === 'string' && value.length > 100) {
                  return value.substring(0, 100) + '...';
                }
                // Защита от нестандартных объектов
                if (value instanceof Error) {
                  return `Объект Error: ${value.message}`;
                }
                if (value instanceof Date) {
                  return `Дата: ${value.toISOString()}`;
                }
                if (typeof value === 'function') {
                  return '[Функция]';
                }
                if (value === null) {
                  return 'null';
                }
                if (value === undefined) {
                  return 'undefined';
                }
                return value;
              }
            ).slice(0, 500);
            
            console.log(`${prefix}:`, serialized);
          } catch (jsonError) {
            // Если сериализация не удалась, логируем базовую информацию об объекте
            console.warn(`${prefix} - Ошибка сериализации:`, jsonError);
            console.log(`${prefix} - Тип:`, typeof obj);
            
            if (typeof obj === 'object' && obj !== null) {
              try {
                // Логируем только ключи объекта
                console.log(`${prefix} - Ключи:`, Object.keys(obj));
              } catch (keysError) {
                console.error(`${prefix} - Ошибка получения ключей:`, keysError);
              }
            }
          }
        } catch (logError) {
          console.error(`${prefix} - Критическая ошибка при логировании:`, logError);
        }
      };
      
      // Проверка и логирование ответов API с защитой от ошибок
      try {
        // Отладка запросов TON Boost с защитой от ошибок сериализации
        if (activeTonBoostsResponse) {
          safeLogObject('[DEBUG] TON Boost Response', activeTonBoostsResponse);
        }
        
        // Отладка запросов транзакций
        if (transactionsResponse) {
          safeLogObject('[DEBUG] Transactions Response', {
            isObject: typeof transactionsResponse === 'object',
            hasSuccess: transactionsResponse && 'success' in transactionsResponse,
            hasTransactions: transactionsResponse?.success && 
              transactionsResponse.data && 
              Array.isArray(transactionsResponse.data.transactions),
            sample: transactionsResponse?.success && 
              transactionsResponse.data && 
              Array.isArray(transactionsResponse.data.transactions) ? 
              transactionsResponse.data.transactions.slice(0, 2) : 'N/A'
          });
        }
        
        // Отладка запросов буст-пакетов
        if (activeBoostsResponse) {
          safeLogObject('[DEBUG] Active Boosts Response', activeBoostsResponse);
        }
        
        // Отладка запросов UNI фарминга
        if (uniFarmingResponse) {
          safeLogObject('[DEBUG] UNI Farming Response', uniFarmingResponse);
        }
      } catch (debugError) {
        console.error('[ERROR] FarmingHistory - Ошибка при отладке ответов API:', debugError);
      }
      
      // Обработка данных UNI фарминга с проверкой структуры
      try {
        if (uniFarmingResponse?.success) {
          try {
            // Проверка наличия данных
            if (!uniFarmingResponse.data) {
              console.warn('[WARNING] FarmingHistory - uniFarmingResponse успешен, но data отсутствует');
            } else {
              // Безопасное извлечение и обработка данных
              // Проверка существующего активного депозита
              const isActive = !!uniFarmingResponse.data.isActive; // Преобразуем в boolean
              
              // Безопасное получение депозита с проверкой строки
              let depositAmount = '0';
              if (uniFarmingResponse.data.depositAmount !== undefined) {
                if (typeof uniFarmingResponse.data.depositAmount === 'string') {
                  depositAmount = uniFarmingResponse.data.depositAmount;
                } else if (typeof uniFarmingResponse.data.depositAmount === 'number') {
                  // Безопасное преобразование числа в строку
                  try {
                    depositAmount = String(uniFarmingResponse.data.depositAmount);
                  } catch (convertError) {
                    console.error('[ERROR] FarmingHistory - Ошибка преобразования depositAmount в строку:', convertError);
                  }
                } else {
                  console.warn('[WARNING] FarmingHistory - Некорректный тип depositAmount:', typeof uniFarmingResponse.data.depositAmount);
                }
              }
              
              // Безопасное создание даты
              let createdAt: Date;
              try {
                if (uniFarmingResponse.data.startDate) {
                  createdAt = new Date(uniFarmingResponse.data.startDate);
                  
                  // Проверка валидности даты
                  if (isNaN(createdAt.getTime())) {
                    console.warn('[WARNING] FarmingHistory - Невалидная дата:', uniFarmingResponse.data.startDate);
                    createdAt = new Date(); // Используем текущую дату как запасной вариант
                  }
                } else {
                  createdAt = new Date();
                }
              } catch (dateError) {
                console.error('[ERROR] FarmingHistory - Ошибка при создании даты:', dateError);
                createdAt = new Date();
              }
              
              // Добавляем активный депозит из API данных
              try {
                farmingDeposits.push({
                  id: 1,
                  packageId: 0, // 0 значит основной UNI фарминг
                  createdAt,
                  isActive,
                  uniYield: "0.5%", 
                  tonYield: "0.0%",
                  bonus: "0 UNI",
                  amount: depositAmount,
                  daysLeft: 365
                });
              } catch (pushError) {
                console.error('[ERROR] FarmingHistory - Ошибка при добавлении депозита UNI фарминга:', pushError);
              }
            }
          } catch (dataError) {
            console.error('[ERROR] FarmingHistory - Ошибка при обработке данных UNI фарминга:', dataError);
          }
        } else if (uniFarmingResponse !== undefined) {
          console.warn('[WARNING] FarmingHistory - uniFarmingResponse не успешен:', uniFarmingResponse);
        }
      } catch (farmingError) {
        console.error('[ERROR] FarmingHistory - Ошибка при обработке UNI фарминга:', farmingError);
      }
      
      // Добавляем активные TON Boost пакеты, если они есть
      if (activeTonBoostsResponse?.success && Array.isArray(activeTonBoostsResponse.data)) {
        activeTonBoostsResponse.data.forEach((tonBoost: TonBoostDeposit, index: number) => {
          const packageId = tonBoost.boost_package_id || 1;
          
          farmingDeposits.push({
            id: 4000000 + index, // Используем диапазон ID для TON Boost
            packageId,
            createdAt: new Date(tonBoost.created_at || Date.now()),
            isActive: true,
            uniYield: "0.0%",
            tonYield: getYieldRateForBoost(packageId),
            bonus: getBoostBonus(packageId),
            amount: tonBoost.amount || "0",
            daysLeft: tonBoost.days_left || 365
          });
        });
      }
      
      // Проверка и логирование структуры транзакций
      console.log("[DEBUG] FarmingHistory - Обработка транзакций, структура:", {
        transactionsResponse,
        isObject: typeof transactionsResponse === 'object',
        hasSuccess: transactionsResponse && 'success' in transactionsResponse,
        hasTransactions: transactionsResponse?.success && 
          transactionsResponse.data && 
          Array.isArray(transactionsResponse.data.transactions)
      });
      
      // Обработка транзакций - новая логика для поддержки API-формата
      let transactionsArray: Transaction[] = [];
      
      if (transactionsResponse?.success && 
          transactionsResponse.data && 
          Array.isArray(transactionsResponse.data.transactions)) {
        // Новый формат API: {success: true, data: {transactions: [...]}}
        transactionsArray = transactionsResponse.data.transactions;
      } else if (Array.isArray(transactionsResponse)) {
        // Старый формат: прямой массив транзакций
        transactionsArray = transactionsResponse;
      }
      
      // Логирование для отладки массива транзакций
      console.log("[DEBUG] FarmingHistory - Массив транзакций:", {
        count: transactionsArray.length,
        types: transactionsArray.length > 0 ? 
          Array.from(new Set(transactionsArray.map(tx => tx.type))).join(', ') : 'N/A',
        sample: transactionsArray.slice(0, 3)
      });
      
      if (transactionsArray.length > 0) {
        // Фильтрация всех транзакций (включая TON и UNI)
        const farmingTransactions = transactionsArray.filter((tx: Transaction) => 
          tx.type !== 'debug' && 
          (tx.currency === 'UNI' || tx.currency === 'TON') && 
          ['deposit', 'farming', 'check-in', 'reward', 'farming_reward', 'ton_boost', 'boost_farming'].includes(tx.type)
        );
        
        // Логирование для отладки фильтрованных транзакций фарминга
        console.log("[DEBUG] FarmingHistory - Фильтрованные транзакции фарминга:", {
          count: farmingTransactions.length,
          types: farmingTransactions.length > 0 ? 
            Array.from(new Set(farmingTransactions.map(tx => tx.type))).join(', ') : 'N/A',
          sample: farmingTransactions.slice(0, 3)
        });
        
        // Находим все UNI депозиты для создания карточек фарминг-депозитов
        const uniDeposits = transactionsArray.filter((tx: Transaction) => 
          tx.type === 'deposit' && 
          tx.currency === 'UNI' && 
          tx.status === 'confirmed'
        );
        
        // Создаем фарминг-депозиты из депозитов UNI
        if (uniDeposits.length > 0) {
          // Сортируем по дате (сначала новые)
          uniDeposits.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
          // Добавляем каждый депозит как отдельный фарминг-депозит
          uniDeposits.forEach((deposit) => {
            // Проверяем, нет ли уже такого депозита (по id)
            const existingDepositIndex = farmingDeposits.findIndex(d => d.id === deposit.id);
            
            if (existingDepositIndex === -1) {
              // Создаем новый фарминг-депозит
              farmingDeposits.push({
                id: 10000 + deposit.id, // Используем уникальный id
                packageId: 0, // 0 значит основной UNI фарминг
                createdAt: new Date(deposit.created_at),
                isActive: true, // Все депозиты считаем активными
                uniYield: "0.5%",
                tonYield: "0.0%",
                bonus: "0 UNI",
                amount: deposit.amount,
                daysLeft: 365
              });
            }
          });
        }
        
        if (farmingTransactions.length > 0) {
          // Если у нас есть UNI фарминг, уточняем его дату активации из транзакции
          if (farmingDeposits.length > 0) {
            // Ищем первый депозит UNI для уточнения даты активации
            const depositTx = farmingTransactions.find((tx: Transaction) => 
              tx.type === 'deposit' && tx.currency === 'UNI'
            );
            
            if (depositTx) {
              // Обновляем дату создания для фарминг-депозита
              farmingDeposits[0].createdAt = new Date(depositTx.created_at);
            }
          }
          
          // Определяем минимальные значимые суммы для каждой валюты
          const MIN_SIGNIFICANT_AMOUNT = {
            UNI: 0.00001, // Минимальная значимая сумма для UNI
            TON: 0.000001 // Минимальная значимая сумма для TON
          };
          
          // Преобразуем транзакции в историю с фильтрацией незначительных сумм и защитой от ошибок
          try {
            // Безопасное преобразование каждой транзакции в элемент истории
            historyItems = farmingTransactions
              .map((tx: Transaction) => {
                try {
                  // Проверка валидности объекта транзакции
                  if (!tx || typeof tx !== 'object') {
                    console.error('[ERROR] FarmingHistory - Невалидная транзакция:', tx);
                    return null;
                  }
                  
                  // Проверка наличия ключевых полей
                  if (!('id' in tx) || !('created_at' in tx)) {
                    console.warn('[WARNING] FarmingHistory - Транзакция без основных полей:', tx);
                    return null;
                  }
                  
                  // Определение типа операции на основе данных транзакции с защитой от undefined
                  let type = 'Операция';
                  
                  // Проверка типа транзакции
                  const txType = tx.type || '';
                  
                  // Используем все доступные типы транзакций с проверкой на существование
                  if (txType === 'farming') type = 'Фарминг';
                  else if (txType === 'farming_reward') type = 'Награда за фарминг';
                  else if (txType === 'boost_farming') type = 'TON фарминг';
                  else if (txType === 'ton_boost') type = 'TON Boost';
                  else if (txType === 'deposit') type = 'Депозит';
                  else if (txType === 'boost') type = 'Boost';
                  else if (txType === 'check-in') type = 'Ежедневный бонус';
                  else if (txType === 'reward') type = 'Награда';
                  
                  // Безопасное определение валюты и суммы
                  const currency = tx.currency || 'UNI'; // По умолчанию UNI
                  
                  // Безопасный парсинг суммы
                  let amount = 0;
                  try {
                    // Проверка, что amount существует
                    if (tx.amount !== undefined && tx.amount !== null) {
                      // Если строка, преобразуем в число
                      if (typeof tx.amount === 'string') {
                        // Удаляем все нечисловые символы кроме точки и минуса
                        const cleanAmount = tx.amount.replace(/[^\d.-]/g, '');
                        amount = parseFloat(cleanAmount);
                        
                        // Проверка на NaN
                        if (isNaN(amount)) {
                          console.warn('[WARNING] FarmingHistory - Невозможно преобразовать сумму в число:', tx.amount);
                          amount = 0;
                        }
                      } else if (typeof tx.amount === 'number') {
                        // Если уже число, просто используем
                        amount = tx.amount;
                        
                        // Проверка на Infinity или NaN
                        if (!isFinite(amount)) {
                          console.warn('[WARNING] FarmingHistory - Бесконечное или невалидное число:', amount);
                          amount = 0;
                        }
                      } else {
                        console.warn('[WARNING] FarmingHistory - Неподдерживаемый тип суммы:', typeof tx.amount);
                        amount = 0;
                      }
                    }
                  } catch (parseError) {
                    console.error('[ERROR] FarmingHistory - Ошибка при парсинге суммы:', parseError);
                    amount = 0;
                  }
                  
                  // Безопасное создание даты
                  let transactionTime: Date;
                  try {
                    if (tx.created_at) {
                      transactionTime = new Date(tx.created_at);
                      
                      // Проверка валидности даты
                      if (isNaN(transactionTime.getTime())) {
                        console.warn('[WARNING] FarmingHistory - Невалидная дата транзакции:', tx.created_at);
                        transactionTime = new Date(); // Используем текущую дату как запасной вариант
                      }
                    } else {
                      console.warn('[WARNING] FarmingHistory - Транзакция без даты:', tx.id);
                      transactionTime = new Date();
                    }
                  } catch (dateError) {
                    console.error('[ERROR] FarmingHistory - Ошибка при создании даты транзакции:', dateError);
                    transactionTime = new Date();
                  }
                  
                  // Отладочное логирование для TON транзакций с защитой от ошибок
                  if (currency === 'TON') {
                    try {
                      console.log("[TON История] Обработка транзакции:", {
                        id: tx.id,
                        time: transactionTime,
                        type: tx.type,
                        rawAmount: tx.amount,
                        parsedAmount: amount,
                        boost_id: tx.boost_id
                      });
                    } catch (logError) {
                      console.error('[ERROR] FarmingHistory - Ошибка при логировании TON транзакции:', logError);
                    }
                  }
                  
                  // Создаем объект истории
                  return {
                    id: tx.id,
                    time: transactionTime,
                    type,
                    amount,
                    currency,
                    boost_id: tx.boost_id,
                    isNew: false
                  };
                } catch (mapError) {
                  console.error('[ERROR] FarmingHistory - Ошибка при преобразовании транзакции:', mapError);
                  return null; // Пропускаем проблемные транзакции
                }
              })
              // Фильтруем null-значения (ошибочные транзакции)
              .filter(item => item !== null)
              // Фильтруем транзакции с нулевыми или слишком малыми суммами
              .filter(item => {
                try {
                  // Проверяем существование item и currency
                  if (!item || !item.currency) return false;
                  
                  // Получаем минимальное значимое значение для данной валюты
                  const minAmount = MIN_SIGNIFICANT_AMOUNT[item.currency as keyof typeof MIN_SIGNIFICANT_AMOUNT] || 0.00001;
                  
                  // Безопасная проверка значимой суммы
                  let isSignificant = false;
                  try {
                    isSignificant = typeof item.amount === 'number' && isFinite(item.amount) && item.amount > minAmount;
                  } catch (amountError) {
                    console.error('[ERROR] FarmingHistory - Ошибка проверки значимости суммы:', amountError);
                    isSignificant = false;
                  }
                  
                  // Логирование отфильтрованных TON транзакций
                  if (!isSignificant && item.currency === 'TON') {
                    console.log(`[TON История] Отфильтрована незначительная транзакция: ID=${item.id}, Сумма=${item.amount}`);
                  }
                  
                  return isSignificant;
                } catch (filterError) {
                  console.error('[ERROR] FarmingHistory - Ошибка при фильтрации транзакции:', filterError);
                  return false; // В случае ошибки фильтрации пропускаем транзакцию
                }
              }) as FarmingHistory[]; // Приведение типа после фильтрации null-значений
          } catch (processError) {
            console.error('[ERROR] FarmingHistory - Критическая ошибка при обработке всех транзакций:', processError);
            historyItems = []; // Используем пустой массив в случае критической ошибки
          }
          
          // Сортируем по дате (сначала новые)
          historyItems.sort((a, b) => b.time.getTime() - a.time.getTime());
          
          // Добавляем активные бусты в депозиты с защитой от ошибок
          try {
            if (activeBoostsResponse?.success && Array.isArray(activeBoostsResponse.data) && activeBoostsResponse.data.length > 0) {
              activeBoostsResponse.data.forEach((boost: { boost_id: number; created_at: string; days_left: number }, index: number) => {
                try {
                  // Проверка валидности буста
                  if (!boost || typeof boost !== 'object') {
                    console.error('[ERROR] FarmingHistory - Невалидный активный буст:', boost);
                    return; // Пропускаем невалидные бусты
                  }
                  
                  // Безопасное получение ID пакета
                  const packageId = boost.boost_id || 1;
                  
                  // Безопасный поиск транзакции
                  let boostTx: Transaction | undefined;
                  try {
                    boostTx = farmingTransactions.find((tx: Transaction) => 
                      tx && typeof tx === 'object' && tx.type === 'boost' && tx.boost_id === packageId
                    );
                  } catch (findError) {
                    console.error('[ERROR] FarmingHistory - Ошибка при поиске транзакции буста:', findError);
                    boostTx = undefined;
                  }
                  
                  // Безопасное создание даты
                  let createdAt: Date;
                  try {
                    // Определяем приоритет источников даты
                    const dateSource = boostTx?.created_at || boost.created_at;
                    
                    if (dateSource) {
                      createdAt = new Date(dateSource);
                      // Проверка валидности даты
                      if (isNaN(createdAt.getTime())) {
                        console.warn('[WARNING] FarmingHistory - Невалидная дата для буста:', dateSource);
                        createdAt = new Date(); // Используем текущую дату как запасной вариант
                      }
                    } else {
                      createdAt = new Date();
                    }
                  } catch (dateError) {
                    console.error('[ERROR] FarmingHistory - Ошибка при создании даты буста:', dateError);
                    createdAt = new Date();
                  }
                  
                  // Безопасное добавление депозита
                  try {
                    // Получаем информацию о доходности буста с защитой от ошибок
                    let tonYield = "0.0%";
                    let boostBonus = "0 UNI";
                    try {
                      tonYield = getYieldRateForBoost(packageId);
                      boostBonus = getBoostBonus(packageId);
                    } catch (yieldError) {
                      console.error('[ERROR] FarmingHistory - Ошибка при получении доходности буста:', yieldError);
                    }
                    
                    // Безопасное получение оставшихся дней
                    const daysLeft = boost.days_left !== undefined && typeof boost.days_left === 'number' && isFinite(boost.days_left) 
                      ? boost.days_left 
                      : 365;
                    
                    // Безопасное получение суммы
                    let amount = "0";
                    if (boostTx && boostTx.amount !== undefined) {
                      if (typeof boostTx.amount === 'string') {
                        amount = boostTx.amount;
                      } else if (typeof boostTx.amount === 'number') {
                        amount = String(boostTx.amount);
                      }
                    }
                    
                    // Добавляем буст в депозиты
                    farmingDeposits.push({
                      id: 2000000 + index,
                      packageId,
                      createdAt,
                      isActive: true,
                      uniYield: "0.0%",
                      tonYield,
                      bonus: boostBonus,
                      amount,
                      daysLeft
                    });
                  } catch (pushError) {
                    console.error('[ERROR] FarmingHistory - Ошибка при добавлении буста в депозиты:', pushError);
                  }
                } catch (boostError) {
                  console.error('[ERROR] FarmingHistory - Критическая ошибка при обработке буста:', boostError);
                }
              });
            }
          } catch (boostsError) {
            console.error('[ERROR] FarmingHistory - Критическая ошибка при обработке всех бустов:', boostsError);
          }
          
          // Добавляем исторические boost транзакции для TON Boost с защитой от ошибок
          try {
            // Безопасная фильтрация транзакций буста
            const boostTransactions = (() => {
              try {
                return farmingTransactions.filter((tx: Transaction) => {
                  try {
                    // Проверка валидности транзакции
                    if (!tx || typeof tx !== 'object') return false;
                    
                    // Проверка типа и валюты
                    return tx.type === 'boost' && tx.currency === 'TON';
                  } catch (txError) {
                    console.error('[ERROR] FarmingHistory - Ошибка при фильтрации буст-транзакции:', txError);
                    return false;
                  }
                });
              } catch (filterError) {
                console.error('[ERROR] FarmingHistory - Ошибка при фильтрации всех буст-транзакций:', filterError);
                return [];
              }
            })();
            
            // Логирование для отладки
            try {
              console.log("[DEBUG] FarmingHistory - Исторические буст-транзакции:", {
                count: boostTransactions.length,
                sample: boostTransactions.slice(0, 2)
              });
            } catch (logError) {
              console.error('[ERROR] FarmingHistory - Ошибка при логировании буст-транзакций:', logError);
            }
            
            // Обработка каждой транзакции с защитой от ошибок
            boostTransactions.forEach((tx: Transaction, index: number) => {
              try {
                // Проверка валидности буст-транзакции
                if (!tx || typeof tx !== 'object' || !tx.boost_id) {
                  console.warn('[WARNING] FarmingHistory - Пропуск невалидной буст-транзакции:', tx);
                  return;
                }
                
                // Безопасная проверка, не добавлен ли уже этот буст как активный
                let isAlreadyActive = false;
                try {
                  isAlreadyActive = farmingDeposits.some(d => {
                    try {
                      return d && typeof d === 'object' && d.packageId === tx.boost_id && d.id >= 2000000;
                    } catch (checkError) {
                      console.error('[ERROR] FarmingHistory - Ошибка проверки существующего депозита:', checkError);
                      return false;
                    }
                  });
                } catch (someError) {
                  console.error('[ERROR] FarmingHistory - Ошибка при проверке активности буста:', someError);
                  isAlreadyActive = false;
                }
                
                // Добавляем только если еще не активен и имеет ID буста
                if (!isAlreadyActive && tx.boost_id) {
                  try {
                    // Безопасное создание даты
                    let createdAt: Date;
                    try {
                      if (tx.created_at) {
                        createdAt = new Date(tx.created_at);
                        // Проверка валидности даты
                        if (isNaN(createdAt.getTime())) {
                          console.warn('[WARNING] FarmingHistory - Невалидная дата для исторического буста:', tx.created_at);
                          createdAt = new Date(); // Используем текущую дату как запасной вариант
                        }
                      } else {
                        console.warn('[WARNING] FarmingHistory - Исторический буст без даты:', tx.id);
                        createdAt = new Date();
                      }
                    } catch (dateError) {
                      console.error('[ERROR] FarmingHistory - Ошибка при создании даты исторического буста:', dateError);
                      createdAt = new Date();
                    }
                    
                    // Получаем информацию о доходности и бонусе с защитой от ошибок
                    let tonYield = "0.0%";
                    let boostBonus = "0 UNI";
                    try {
                      tonYield = getYieldRateForBoost(tx.boost_id);
                      boostBonus = getBoostBonus(tx.boost_id);
                    } catch (rateError) {
                      console.error('[ERROR] FarmingHistory - Ошибка при получении информации о ставке буста:', rateError);
                    }
                    
                    // Безопасное получение суммы
                    let amount = "0";
                    try {
                      if (tx.amount !== undefined) {
                        if (typeof tx.amount === 'string') {
                          amount = tx.amount;
                        } else if (typeof tx.amount === 'number') {
                          amount = String(tx.amount);
                        }
                      }
                    } catch (amountError) {
                      console.error('[ERROR] FarmingHistory - Ошибка при получении суммы буста:', amountError);
                    }
                    
                    // Добавляем исторический буст в депозиты
                    farmingDeposits.push({
                      id: 3000000 + index,
                      packageId: tx.boost_id,
                      createdAt,
                      isActive: false, // Исторические бусты не активны
                      uniYield: "0.0%",
                      tonYield,
                      bonus: boostBonus,
                      amount,
                      daysLeft: 0
                    });
                  } catch (pushError) {
                    console.error('[ERROR] FarmingHistory - Ошибка при добавлении исторического буста в депозиты:', pushError);
                  }
                }
              } catch (txProcessError) {
                console.error('[ERROR] FarmingHistory - Критическая ошибка при обработке буст-транзакции:', txProcessError);
              }
            });
          } catch (boostTxsError) {
            console.error('[ERROR] FarmingHistory - Критическая ошибка при обработке всех исторических бустов:', boostTxsError);
          }
        }
      }
      
      // Устанавливаем данные для отображения
      setFarmingHistory(historyItems);
      setDeposits(farmingDeposits);
      setOpacity(1);
      setTranslateY(0);
    } catch (error: any) {
      console.error("[ERROR] FarmingHistory - Ошибка при обработке данных:", error);
      // В случае ошибки, устанавливаем пустые данные
      setFarmingHistory([]);
      setDeposits([]);
    } finally {
      // Всегда убираем состояние загрузки
      setIsLoading(false);
    }
  }, [transactionsResponse, activeBoostsResponse, activeTonBoostsResponse, uniFarmingResponse]);
  
  // Функция для получения доходности буста по его ID
  // Функция получения ставки доходности для TON буста с защитой от ошибок
  const getYieldRateForBoost = (boostId: number): string => {
    try {
      // Проверка валидности входного параметра
      if (boostId === undefined || boostId === null || isNaN(boostId)) {
        console.warn(`[WARNING] FarmingHistory - Некорректный ID буста: ${boostId}`);
        return '0.0%'; // Безопасное значение по умолчанию
      }
      
      // Определение ставок для разных пакетов с защитой
      const rates: Record<number, string> = {
        1: '0.5%',
        2: '1.0%',
        3: '2.0%',
        4: '2.5%'
      };
      
      // Получение ставки с проверкой наличия
      const yield_rate = rates[boostId];
      
      if (yield_rate === undefined) {
        console.warn(`[WARNING] FarmingHistory - Ставка для буста с ID ${boostId} не найдена`);
        return '0.0%';
      }
      
      return yield_rate;
    } catch (error) {
      console.error("[ERROR] FarmingHistory - Ошибка в getYieldRateForBoost:", error);
      return '0.0%'; // Безопасное значение при любой ошибке
    }
  };
  
  // Функция для получения бонуса буста по его ID с защитой от ошибок
  const getBoostBonus = (boostId: number): string => {
    try {
      // Проверка валидности входного параметра
      if (boostId === undefined || boostId === null || isNaN(boostId)) {
        console.warn(`[WARNING] FarmingHistory - Некорректный ID буста для бонуса: ${boostId}`);
        return '0 UNI'; // Безопасное значение по умолчанию
      }
      
      // Определение бонусов для разных пакетов с защитой
      const bonuses: Record<number, string> = {
        1: '+10,000 UNI',
        2: '+75,000 UNI',
        3: '+250,000 UNI',
        4: '+500,000 UNI'
      };
      
      // Получение бонуса с проверкой наличия
      const bonus = bonuses[boostId];
      
      if (bonus === undefined) {
        console.warn(`[WARNING] FarmingHistory - Бонус для буста с ID ${boostId} не найден`);
        return '0 UNI';
      }
      
      return bonus;
    } catch (error) {
      console.error("[ERROR] FarmingHistory - Ошибка в getBoostBonus:", error);
      return '0 UNI'; // Безопасное значение при любой ошибке
    }
  };
  
  // Генерируем декоративные частицы для пустого состояния
  const particles = Array(5).fill(0).map((_, i) => ({
    id: i,
    size: Math.random() * 5 + 3, // 3-8px
    top: Math.random() * 70 + 10, // 10-80%
    left: Math.random() * 80 + 10, // 10-90%
    animationDuration: Math.random() * 10 + 10, // 10-20s
    blurAmount: Math.random() * 3 + 1, // 1-4px blur
  }));
  
  // Форматирование даты с использованием date-fns с защитой от ошибок
  const formatDate = (date: Date | null | undefined): string => {
    try {
      // Проверка существования даты
      if (!date) {
        console.warn('[WARNING] FarmingHistory - Попытка форматирования null/undefined даты');
        return '-- --- ----, --:--';
      }
      
      // Проверка, что дата является объектом Date
      if (!(date instanceof Date)) {
        console.warn('[WARNING] FarmingHistory - Переданный объект не является Date:', date);
        try {
          // Попытка преобразовать в Date
          const newDate = new Date(date as any);
          if (isNaN(newDate.getTime())) {
            throw new Error('Невалидная дата после преобразования');
          }
          date = newDate;
        } catch (conversionError) {
          console.error('[ERROR] FarmingHistory - Ошибка преобразования в Date:', conversionError);
          return '-- --- ----, --:--';
        }
      }
      
      // Проверка валидности даты
      if (isNaN(date.getTime())) {
        console.warn('[WARNING] FarmingHistory - Невалидная дата для форматирования:', date);
        return '-- --- ----, --:--';
      }
      
      // Безопасное форматирование с применением locale
      try {
        return format(date, 'd MMM yyyy, HH:mm', { locale: ru });
      } catch (formatError) {
        console.error('[ERROR] FarmingHistory - Ошибка при форматировании даты:', formatError);
        
        // Запасной вариант без locale
        try {
          return date.toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch (fallbackError) {
          console.error('[ERROR] FarmingHistory - Ошибка при запасном форматировании даты:', fallbackError);
          
          // Последний резерв - просто преобразование в строку
          try {
            return date.toString();
          } catch (stringError) {
            console.error('[ERROR] FarmingHistory - Критическая ошибка при форматировании даты:', stringError);
            return '-- --- ----, --:--';
          }
        }
      }
    } catch (error) {
      console.error('[ERROR] FarmingHistory - Глобальная ошибка в formatDate:', error);
      return '-- --- ----, --:--';
    }
  };
  
  // Форматирование времени с использованием date-fns с защитой от ошибок
  const formatTime = (date: Date | null | undefined): string => {
    try {
      // Проверка существования даты
      if (!date) {
        console.warn('[WARNING] FarmingHistory - Попытка форматирования null/undefined времени');
        return '--:--:--';
      }
      
      // Проверка, что дата является объектом Date
      if (!(date instanceof Date)) {
        console.warn('[WARNING] FarmingHistory - Переданный объект не является Date для времени:', date);
        try {
          // Попытка преобразовать в Date
          const newDate = new Date(date as any);
          if (isNaN(newDate.getTime())) {
            throw new Error('Невалидная дата после преобразования для времени');
          }
          date = newDate;
        } catch (conversionError) {
          console.error('[ERROR] FarmingHistory - Ошибка преобразования в Date для времени:', conversionError);
          return '--:--:--';
        }
      }
      
      // Проверка валидности даты
      if (isNaN(date.getTime())) {
        console.warn('[WARNING] FarmingHistory - Невалидная дата для форматирования времени:', date);
        return '--:--:--';
      }
      
      // Безопасное форматирование времени
      try {
        return format(date, 'HH:mm:ss', { locale: ru });
      } catch (formatError) {
        console.error('[ERROR] FarmingHistory - Ошибка при форматировании времени:', formatError);
        
        // Запасной вариант без locale
        try {
          return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        } catch (fallbackError) {
          console.error('[ERROR] FarmingHistory - Ошибка при запасном форматировании времени:', fallbackError);
          
          // Последний резерв - просто часы и минуты
          try {
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
          } catch (stringError) {
            console.error('[ERROR] FarmingHistory - Критическая ошибка при форматировании времени:', stringError);
            return '--:--:--';
          }
        }
      }
    } catch (error) {
      console.error('[ERROR] FarmingHistory - Глобальная ошибка в formatTime:', error);
      return '--:--:--';
    }
  };
  
  // Безопасное форматирование числовых значений с защитой от ошибок
  const safeFormatAmount = (amount: string | number | null | undefined, decimals: number = 2): string => {
    try {
      // Проверка существования значения
      if (amount === null || amount === undefined) {
        console.warn('[WARNING] FarmingHistory - Попытка форматирования null/undefined суммы');
        return '0.00';
      }
      
      // Преобразование в число, если строка
      let numericAmount: number;
      
      if (typeof amount === 'string') {
        try {
          // Попытка удалить все нечисловые символы кроме точки
          const cleanedString = amount.replace(/[^\d.-]/g, '');
          numericAmount = parseFloat(cleanedString);
          
          if (isNaN(numericAmount)) {
            console.warn('[WARNING] FarmingHistory - Невозможно преобразовать строку в число:', amount);
            return '0.00';
          }
        } catch (parseError) {
          console.error('[ERROR] FarmingHistory - Ошибка при парсинге строки в число:', parseError);
          return '0.00';
        }
      } else if (typeof amount === 'number') {
        numericAmount = amount;
      } else {
        console.warn('[WARNING] FarmingHistory - Неподдерживаемый тип для суммы:', typeof amount);
        return '0.00';
      }
      
      // Проверка на валидность числа
      if (!isFinite(numericAmount)) {
        console.warn('[WARNING] FarmingHistory - Бесконечное или невалидное число:', numericAmount);
        return '0.00';
      }
      
      // Безопасное форматирование с защитой от ошибок
      try {
        return numericAmount.toFixed(decimals);
      } catch (formatError) {
        console.error('[ERROR] FarmingHistory - Ошибка при форматировании числа:', formatError);
        
        // Запасной вариант через строковое представление
        try {
          return String(Math.round(numericAmount * Math.pow(10, decimals)) / Math.pow(10, decimals));
        } catch (fallbackError) {
          console.error('[ERROR] FarmingHistory - Критическая ошибка при форматировании числа:', fallbackError);
          return '0.00';
        }
      }
    } catch (error) {
      console.error('[ERROR] FarmingHistory - Глобальная ошибка в safeFormatAmount:', error);
      return '0.00';
    }
  };
  
  // Функция для определения оптимального количества десятичных знаков в зависимости от величины суммы
  const getOptimalDecimals = (amount: number | string, currency: string = 'UNI'): number => {
    try {
      // Преобразуем в число, если это строка
      let numericAmount: number;
      if (typeof amount === 'string') {
        try {
          numericAmount = parseFloat(amount);
          if (isNaN(numericAmount)) {
            throw new Error('Невалидное число');
          }
        } catch (parseError) {
          console.error('[ERROR] FarmingHistory - Ошибка преобразования строки в число:', parseError);
          // Возвращаем значение по умолчанию
          return currency === 'TON' ? 3 : 2;
        }
      } else if (typeof amount === 'number') {
        numericAmount = amount;
      } else {
        console.warn('[WARNING] FarmingHistory - Неподдерживаемый тип данных для определения десятичных знаков:', typeof amount);
        return currency === 'TON' ? 3 : 2;
      }
      
      // Проверка валидности числа
      if (!isFinite(numericAmount)) {
        console.warn('[WARNING] FarmingHistory - Бесконечное или невалидное число при определении знаков:', numericAmount);
        return currency === 'TON' ? 3 : 2;
      }
      
      // Логика определения количества десятичных знаков в зависимости от валюты и величины
      if (currency === 'TON') {
        // Для TON
        if (numericAmount < 0.001) return 6;
        if (numericAmount < 0.01) return 5;
        if (numericAmount < 0.1) return 4;
        return 3;
      } else {
        // Для UNI и других валют
        if (numericAmount < 0.0001) return 8;
        if (numericAmount < 0.001) return 6;
        if (numericAmount < 0.01) return 5;
        if (numericAmount < 0.1) return 4;
        if (numericAmount < 1) return 3;
        if (numericAmount < 10) return 2;
        return 2;
      }
    } catch (error) {
      console.error('[ERROR] FarmingHistory - Ошибка определения количества десятичных знаков:', error);
      // В случае ошибки возвращаем значение по умолчанию
      return currency === 'TON' ? 3 : 2;
    }
  };
  
  // Получение информации о пакете по ID
  const getPackageInfo = (packageId: number) => {
    return BOOST_PACKAGES.find(pkg => pkg.id === packageId) || null;
  };
  
  // Генерация строки типа пакета
  const getPackageTypeString = (deposit: FarmingDeposit): string => {
    // Для основного UNI пакета (packageId = 0)
    if (deposit.packageId === 0) {
      return `Основной UNI пакет (${deposit.uniYield})`;
    }
    
    const packageInfo = getPackageInfo(deposit.packageId);
    if (!packageInfo) return 'Неизвестный пакет';
    
    return `${packageInfo.type} Boost ${packageInfo.price.includes('TON') ? 
      packageInfo.price.split(' + ')[1] : packageInfo.price} (${deposit.uniYield}/${deposit.tonYield})`;
  };
  
  // Рендер вкладки с UNI фармингом
  const renderDepositsTab = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-opacity-50 border-t-primary rounded-full"></div>
        </div>
      );
    }
    
    // Проверяем наличие UNI транзакций с защитой от ошибок
    const hasUniTransactions = (() => {
      try {
        return farmingHistory.filter(item => {
          try {
            // Безопасная проверка на UNI транзакцию
            return item && typeof item === 'object' && item.currency === 'UNI';
          } catch (itemError) {
            console.error('[ERROR] FarmingHistory - Ошибка при фильтрации UNI транзакции:', itemError);
            return false;
          }
        }).length > 0;
      } catch (filterError) {
        console.error('[ERROR] FarmingHistory - Критическая ошибка в фильтре UNI транзакций:', filterError);
        return false;
      }
    })();
    
    if (!hasUniTransactions) {
      return (
        <div 
          className="text-center py-16 flex flex-col items-center justify-center"
          style={{ 
            opacity, 
            transform: `translateY(${translateY}px)`,
            transition: 'opacity 0.8s ease, transform 0.8s ease'
          }}
        >
          <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-4">
            <i className="fas fa-seedling text-3xl text-foreground/40"></i>
          </div>
          
          <p className="text-md text-foreground opacity-80 mb-2">
            У вас пока нет UNI транзакций
          </p>
          
          <p className="text-sm text-foreground opacity-50 max-w-sm mx-auto">
            Откройте UNI фарминг на главной вкладке, чтобы начать зарабатывать
          </p>
          
          <button className="mt-6 gradient-button text-white px-4 py-2 rounded-lg font-medium transition-transform hover:scale-105">
            Начать фарминг
          </button>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {/* Отображаем только историю транзакций UNI фарминга */}
        <div className="mt-6 pt-6 border-t border-gray-800/30">
          <h3 className="text-md font-medium mb-4">История UNI фарминга</h3>
          
          <div className="overflow-hidden relative">
            {farmingHistory.filter(item => item.currency === 'UNI').length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-foreground opacity-70">
                  У вас пока нет транзакций по фармингу UNI
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-gray-800">
                    <th className="py-2 text-left text-sm text-foreground opacity-70">Дата и время</th>
                    <th className="py-2 text-left text-sm text-foreground opacity-70">Операция</th>
                    <th className="py-2 text-right text-sm text-foreground opacity-70">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Добавлена фильтрация по активной вкладке */}
                  {farmingHistory
                    .filter(item => {
                      // Фильтрация по активной вкладке
                      if (activeTab === 'uni') {
                        return item.currency === 'UNI';
                      } else {
                        return item.currency === 'TON';
                      }
                    })
                    .map((item) => (
                      <tr 
                        key={item.id} 
                        className={`border-b border-gray-800/30 ${item.isNew ? 'animate-highlight' : ''}`}
                      >
                        <td className="py-2 text-sm text-foreground opacity-70">{formatDate(item.time)}</td>
                        <td className="py-2 text-sm text-foreground">
                          <div className="flex items-center">
                            <span className={`
                              inline-block w-2 h-2 rounded-full mr-2
                              ${item.type === 'Фарминг' ? 'bg-green-500' : 
                                item.type === 'Депозит' ? 'bg-purple-500' : 
                                item.type === 'Награда за фарминг' ? 'bg-pink-500' : 
                                item.type === 'TON фарминг' ? 'bg-blue-500' : 
                                item.type === 'Ежедневный бонус' ? 'bg-yellow-500' : 
                                'bg-blue-500'}
                            `}></span>
                            {item.type}
                          </div>
                        </td>
                        <td className="py-2 text-sm text-right">
                          <span className={item.currency === 'UNI' ? "text-purple-300" : "text-blue-300"}>
                            +{(() => {
                              try {
                                // Определяем оптимальное количество десятичных знаков в зависимости от валюты и размера суммы
                                const decimals = getOptimalDecimals(item.amount, item.currency);
                                
                                // Используем безопасное форматирование
                                return safeFormatAmount(item.amount, decimals);
                              } catch (error) {
                                console.error('[ERROR] FarmingHistory - Ошибка при форматировании суммы транзакции:', error);
                                // Безопасное значение по умолчанию
                                return '0.00';
                              }
                            })()}
                          </span>
                          <span className="text-gray-400 ml-1.5 text-xs">{item.currency}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // Вспомогательные функции для безопасного форматирования сумм
  
  /**
   * Определяет оптимальное количество десятичных знаков в зависимости от валюты и размера числа
   * @param value Числовое значение для форматирования
   * @param currency Валюта (TON или UNI)
   * @returns Оптимальное количество десятичных знаков
   */
  const getOptimalDecimals = (value: number | string, currency: string = 'UNI'): number => {
    try {
      // Преобразование к числу, если передана строка
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      
      // Проверка на валидное число
      if (numValue === undefined || numValue === null || !isFinite(numValue)) {
        console.warn(`[WARNING] FarmingHistory - Некорректное значение для определения десятичных знаков: ${value}`);
        return currency === 'TON' ? 6 : 2;
      }
      
      // Разные стратегии для разных валют
      if (currency === 'TON') {
        // Для TON: больше знаков для маленьких сумм
        if (numValue < 0.0001) return 8;
        if (numValue < 0.001) return 6;
        if (numValue < 0.01) return 5;
        if (numValue < 0.1) return 4;
        if (numValue < 1) return 3;
        return 2;
      } else {
        // Для UNI: стандартно 2 знака, но больше для маленьких сумм
        if (numValue < 0.01) return 4;
        if (numValue < 0.1) return 3;
        return 2;
      }
    } catch (error) {
      console.error("[ERROR] FarmingHistory - Ошибка в getOptimalDecimals:", error);
      return currency === 'TON' ? 6 : 2; // Безопасные значения по умолчанию
    }
  };
  
  /**
   * Безопасно форматирует число с заданной точностью
   * @param value Числовое значение для форматирования
   * @param decimals Количество десятичных знаков
   * @returns Отформатированная строка
   */
  const safeFormatAmount = (value: number | string, decimals: number = 2): string => {
    try {
      // Валидация входных параметров
      if (value === undefined || value === null) {
        return "0".padEnd(decimals + 2, "0");
      }
      
      // Безопасное преобразование к числу
      let numValue: number;
      if (typeof value === 'string') {
        // Очистка строки от нечисловых символов, кроме точки и минуса
        const cleanStr = value.replace(/[^\d.-]/g, '');
        numValue = parseFloat(cleanStr);
      } else if (typeof value === 'number') {
        numValue = value;
      } else {
        console.warn(`[WARNING] FarmingHistory - Неподдерживаемый тип значения: ${typeof value}`);
        return "0".padEnd(decimals + 2, "0");
      }
      
      // Проверка на валидное число
      if (!isFinite(numValue)) {
        console.warn(`[WARNING] FarmingHistory - Невалидное число для форматирования: ${value}`);
        return "0".padEnd(decimals + 2, "0");
      }
      
      // Форматирование числа с безопасной проверкой на очень маленькие значения
      if (numValue > 0 && numValue < Math.pow(10, -decimals)) {
        // Если значение положительное, но слишком маленькое для отображения - показываем минимальное отображаемое значение
        const minDisplayValue = Math.pow(10, -decimals);
        return minDisplayValue.toFixed(decimals);
      }
      
      // Стандартное форматирование для обычных значений
      return numValue.toFixed(decimals);
    } catch (error) {
      console.error("[ERROR] FarmingHistory - Ошибка в safeFormatAmount:", error);
      // Безопасное значение при ошибке
      return "0".padEnd(decimals + 2, "0");
    }
  };
  
  // Рендер вкладки с TON Boost пакетами
  // Функция для форматирования числа с заданной точностью (устарела, используйте safeFormatAmount)
  const formatNumberWithPrecision = (value: number, precision: number = 2) => {
    try {
      // Проверяем, что значение существует и является числом
      if (value === undefined || value === null || !isFinite(value)) {
        return "0".padEnd(precision + 2, "0");
      }
      
      // Форматируем число с заданной точностью
      const valueStr = value.toFixed(precision);
      
      // Если значение близко к нулю (меньше 0.00001), показываем "0.00000"
      if (value > 0 && value < Math.pow(10, -precision)) {
        return "0".padEnd(precision + 2, "0");
      }
      
      return valueStr;
    } catch (error) {
      console.error("[ERROR] FarmingHistory - Ошибка в formatNumberWithPrecision:", error);
      return "0".padEnd(precision + 2, "0");
    }
  };

  const renderTonBoostTab = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-400 border-opacity-50 border-t-blue-400 rounded-full"></div>
        </div>
      );
    }
    
    // Проверка наличия TON транзакций с защитой от ошибок
    const hasTonTransactions = (() => {
      try {
        return farmingHistory.filter(item => {
          try {
            // Безопасная проверка на TON транзакцию
            const isTonCurrency = item.currency === 'TON';
            
            // Защищенная проверка суммы
            let hasSignificantAmount = false;
            try {
              // Преобразуем к числу для гарантии корректного сравнения
              const numAmount = typeof item.amount === 'string' 
                ? parseFloat(item.amount) 
                : typeof item.amount === 'number' 
                  ? item.amount 
                  : 0;
                
              // Проверка на минимально значимую сумму
              hasSignificantAmount = isFinite(numAmount) && numAmount >= 0.000001;
            } catch (amountError) {
              console.error('[ERROR] FarmingHistory - Ошибка проверки суммы транзакции TON:', amountError);
              hasSignificantAmount = false;
            }
            
            return isTonCurrency && hasSignificantAmount;
          } catch (itemError) {
            console.error('[ERROR] FarmingHistory - Ошибка при фильтрации TON транзакции:', itemError);
            return false;
          }
        }).length > 0;
      } catch (filterError) {
        console.error('[ERROR] FarmingHistory - Критическая ошибка в фильтре TON транзакций:', filterError);
        return false;
      }
    })();
    
    // Если нет TON транзакций, показываем информационное сообщение
    if (!hasTonTransactions) {
      return (
        <div 
          className="text-center py-16 flex flex-col items-center justify-center"
          style={{ 
            opacity, 
            transform: `translateY(${translateY}px)`,
            transition: 'opacity 0.8s ease, transform 0.8s ease'
          }}
        >
          <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-4">
            <i className="fas fa-rocket text-3xl text-foreground/40"></i>
          </div>
          
          <p className="text-md text-foreground opacity-80 mb-2">
            У вас пока нет TON транзакций
          </p>
          
          <p className="text-sm text-foreground opacity-50 max-w-sm mx-auto">
            Приобретите TON Boost на вкладке "TON Фарминг", чтобы начать получать доход в TON
          </p>
          
          <button className="mt-6 gradient-button-blue text-white px-4 py-2 rounded-lg font-medium transition-transform hover:scale-105">
            Перейти к TON Boost
          </button>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {/* Отображаем только историю транзакций TON фарминга, без карточек активных буст-пакетов */}
        <div className="mt-6 pt-6 border-t border-gray-800/30">
          <h3 className="text-md font-medium mb-4">История TON транзакций</h3>
          
          <div className="overflow-hidden relative">
            <table className="w-full">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-gray-800">
                  <th className="py-2 text-left text-sm text-foreground opacity-70">Дата и время</th>
                  <th className="py-2 text-left text-sm text-foreground opacity-70">Операция</th>
                  <th className="py-2 text-right text-sm text-foreground opacity-70">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {farmingHistory
                  .filter(item => item.currency === 'TON')
                  .map((item) => (
                    <tr 
                      key={item.id} 
                      className={`border-b border-gray-800/30 ${item.isNew ? 'animate-highlight' : ''}`}
                    >
                      <td className="py-2 text-sm text-foreground opacity-70">{formatDate(item.time)}</td>
                      <td className="py-2 text-sm text-foreground">
                        <div className="flex items-center">
                          <span className={`
                            inline-block w-2 h-2 rounded-full mr-2
                            ${item.type === 'TON фарминг' ? 'bg-blue-500' : 
                              item.type === 'TON Boost' ? 'bg-green-500' : 
                              item.type === 'Boost' ? 'bg-indigo-500' : 
                              'bg-blue-500'}
                          `}></span>
                          {item.type}
                        </div>
                      </td>
                      <td className="py-2 text-sm text-right">
                        <span className="text-blue-300">
                          +{(() => {
                            try {
                              // Определяем оптимальное количество десятичных знаков для TON
                              const decimals = getOptimalDecimals(item.amount, 'TON');
                              
                              // Используем безопасное форматирование
                              return safeFormatAmount(item.amount, decimals);
                            } catch (error) {
                              console.error('[ERROR] FarmingHistory - Ошибка при форматировании TON суммы:', error);
                              // Безопасное значение по умолчанию
                              return '0.000';
                            }
                          })()}
                        </span>
                        <span className="text-gray-400 ml-1.5 text-xs">TON</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };
  
  // Обработчик обновления данных
  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      
      // Параллельно обновляем все данные
      await Promise.all([
        refetchTransactions(),
        refetchBoosts(),
        refetchTonBoosts(),
        refetchFarming()
      ]);
      
      // Данные будут автоматически обработаны через useEffect,
      // когда обновятся transactionsResponse, activeBoostsResponse и uniFarmingResponse
    } catch (err) {
      console.error("Ошибка обновления данных:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-card rounded-md p-4 md:p-6 relative overflow-hidden">
      {/* Декоративные частицы для фона пустого состояния */}
      {!isLoading && (farmingHistory.length === 0 || deposits.length === 0) && (
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          {particles.map(particle => (
            <div 
              key={particle.id}
              className="absolute rounded-full bg-gradient-to-br from-primary/30 to-primary/10"
              style={{
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                top: `${particle.top}%`,
                left: `${particle.left}%`,
                animation: `float ${particle.animationDuration}s infinite ease-in-out`,
                filter: `blur(${particle.blurAmount}px)`,
                opacity: '0.4'
              }}
            />
          ))}
        </div>
      )}
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium">История фарминга</h2>
          <div>
            <button 
              onClick={handleRefresh}
              disabled={isLoading}
              className="text-foreground opacity-70 hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-foreground/10"
            >
              <i className={`fas fa-sync-alt ${isLoading ? 'animate-spin' : ''}`}></i>
            </button>
          </div>
        </div>
        
        {/* Табы UNI/TON */}
        <div className="border-b border-background/30 flex space-x-4 mb-6">
          <button 
            className={`py-2 px-1 text-md flex items-center space-x-1.5 relative ${activeTab === 'uni' ? 'text-primary' : 'text-foreground/50 hover:text-foreground/70'}`}
            onClick={() => setActiveTab('uni')}
          >
            <i className="fas fa-coins"></i>
            <span>UNI</span>
            
            {activeTab === 'uni' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-lg"></div>
            )}
          </button>
          
          <button 
            className={`py-2 px-1 text-md flex items-center space-x-1.5 relative ${activeTab === 'ton' ? 'text-blue-400' : 'text-foreground/50 hover:text-foreground/70'}`}
            onClick={() => setActiveTab('ton')}
          >
            <i className="fas fa-gem"></i>
            <span>TON</span>
            
            {activeTab === 'ton' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400 rounded-t-lg"></div>
            )}
          </button>
        </div>
        
        {/* Контент для активной вкладки */}
        <div 
          style={{ 
            opacity: isLoading ? 0.5 : 1,
            transition: 'opacity 0.3s ease'
          }}
        >
          {activeTab === 'uni' ? renderDepositsTab() : renderTonBoostTab()}
        </div>
      </div>
    </div>
  );
};

export default FarmingHistory;