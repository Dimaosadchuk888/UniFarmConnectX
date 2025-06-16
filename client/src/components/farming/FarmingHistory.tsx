import frontendLogger from "../../utils/frontendLogger";
import React, { useState, useEffect } from 'react';
import { BOOST_PACKAGES } from '@/lib/constants';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { formatAmount, safeFormatAmount, getOptimalDecimals } from '@/utils/formatters';

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
  boost_package_id?: number;
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
  boost_package_id?: number;
  currency?: string;
  status?: string;
  source?: string;
  category?: string;
  description?: string;
  data?: any;
}

// Интерфейс для пропсов компонента
interface FarmingHistoryProps {
  userId: number;
}

// Основной компонент истории фарминга
const FarmingHistory: React.FC<FarmingHistoryProps> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState('ton');  // Меняем начальную вкладку на 'ton' вместо 'uni'
  const [farmingHistory, setFarmingHistory] = useState<FarmingHistory[]>([]);
  const [deposits, setDeposits] = useState<FarmingDeposit[]>([]);
  const [opacity, setOpacity] = useState(0);
  const [translateY, setTranslateY] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  
  // Убеждаемся, что userId определен
  const validUserId = userId || 1; // Используем 1 как фолбэк значение, если userId не передан
  
  // Запрос на получение транзакций с усиленной обработкой ошибок
  const { data: transactionsResponse, refetch: refetchTransactions } = useQuery({
    queryKey: ['/api/v2/transactions', { user_id: validUserId }],
    queryFn: async () => {
      try {
        // Проверка наличия userId перед запросом
        if (!validUserId) {return { success: true, data: { transactions: [] } };
        }
        
        // Используем correctApiRequest с расширенной обработкой ошибок
        try {
          const result = await correctApiRequest(`/api/v2/transactions?user_id=${validUserId}`, 'GET');
          
          // Проверка структуры ответа на валидность
          if (!result) {return { success: true, data: { transactions: [] } };
          }
          
          if (typeof result !== 'object') {return { success: true, data: { transactions: [] } };
          }
          
          // Проверка на API-формат с success полем
          if ('success' in result) {
            if (!result.success) {return { success: true, data: { transactions: [] } };
            }
            
            // Проверяем наличие данных в успешном ответе
            if (!result.data) {return { success: true, data: { transactions: [] } };
            }
            
            // Возвращаем ответ в новом формате API
            return result;
          } else if (Array.isArray(result)) {
            // Старый формат без success поля - просто массив транзакций
            // Адаптируем формат для совместимости
            return { success: true, data: { transactions: result } };
          } else {return { success: true, data: { transactions: [] } };
          }
        } catch (apiError) {return { success: true, data: { transactions: [] } };
        }
      } catch (globalError) {return { success: true, data: { transactions: [] } };
      }
    },
    enabled: !!validUserId,
    refetchInterval: 10000, // Обновляем каждые 10 секунд
  });
  
  // Запрос на получение активных TON бустов (единый эндпоинт)
  const { data: activeTonBoostsResponse, refetch: refetchTonBoosts } = useQuery({
    queryKey: ['/api/v2/ton-farming/active', { user_id: validUserId }],
    queryFn: async () => {
      try {
        // Проверка наличия userId перед запросом
        if (!validUserId) {return { success: true, data: [] };
        }
        
        // Используем correctApiRequest с расширенной обработкой ошибок
        try {
          const result = await correctApiRequest(`/api/v2/ton-farming/active?user_id=${validUserId}`, 'GET');
          
          // Проверка структуры ответа на валидность
          if (!result) {return { success: true, data: [] };
          }
          
          if (typeof result !== 'object') {return { success: true, data: [] };
          }
          
          // Проверка на API-формат с success полем
          if ('success' in result) {
            if (!result.success) {return { success: true, data: [] };
            }
            
            // Проверяем наличие данных в успешном ответе
            if (!result.data) {return { success: true, data: [] };
            }
            
            // Если data не массив, преобразуем
            if (!Array.isArray(result.data)) {return { success: true, data: [] };
            }
            
            return result;
          } else if (Array.isArray(result)) {
            // Старый формат без success поля - просто массив бустов
            // Адаптируем формат для совместимости
            return { success: true, data: result };
          } else {return { success: true, data: [] };
          }
        } catch (apiError) {return { success: true, data: [] };
        }
      } catch (globalError) {return { success: true, data: [] };
      }
    },
    enabled: !!validUserId,
    refetchInterval: 10000, // Обновляем каждые 10 секунд
  });

  // Запрос на получение состояния UNI фарминга
  const { data: uniFarmingResponse, refetch: refetchFarming } = useQuery({
    queryKey: ['/api/v2/uni-farming/status', { user_id: validUserId }],
    queryFn: async () => {
      try {
        // Проверка наличия userId перед запросом
        if (!validUserId) {return { success: true, data: { isActive: false, depositAmount: "0" } };
        }
        
        // Используем correctApiRequest с расширенной обработкой ошибок
        try {
          const result = await correctApiRequest(`/api/v2/uni-farming/status?user_id=${validUserId}`, 'GET');
          
          // Проверка структуры ответа на валидность
          if (!result) {return { success: true, data: { isActive: false, depositAmount: "0" } };
          }
          
          if (typeof result !== 'object') {return { success: true, data: { isActive: false, depositAmount: "0" } };
          }
          
          // Проверка на API-формат с success полем
          if ('success' in result) {
            if (!result.success) {return { success: true, data: { isActive: false, depositAmount: "0" } };
            }
            
            // Проверяем наличие данных в успешном ответе
            if (!result.data) {return { success: true, data: { isActive: false, depositAmount: "0" } };
            }
            
            return result;
          } else {
            // Если формат ответа не стандартный, возвращаем безопасный форматreturn { success: true, data: { isActive: false, depositAmount: "0" } };
          }
        } catch (apiError) {return { success: true, data: { isActive: false, depositAmount: "0" } };
        }
      } catch (globalError) {return { success: true, data: { isActive: false, depositAmount: "0" } };
      }
    },
    enabled: !!validUserId,
    refetchInterval: 10000, // Обновляем каждые 10 секунд
  });
  
  // Эффект для отладки ответов API
  useEffect(() => {
    if (activeTonBoostsResponse) {if (activeTonBoostsResponse.success && Array.isArray(activeTonBoostsResponse.data)) {activeTonBoostsResponse.data.forEach((boost: TonBoostDeposit, index: number) => {});
      }
    }
  }, [activeTonBoostsResponse]);
  
  // Эффект для логирования информации о едином API эндпоинте
  useEffect(() => {
    if (activeTonBoostsResponse) {
      const boostsCount = activeTonBoostsResponse.success && Array.isArray(activeTonBoostsResponse.data) 
        ? activeTonBoostsResponse.data.length 
        : 0;}
  }, [activeTonBoostsResponse]);
  
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
      } catch (stateError) {}
      
      // Безопасная функция для логирования объектов без риска циклических ссылок или ошибок сериализации
      const safeLogObject = (prefix: string, obj: any) => {
        try {
          if (!obj) {return;
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
          } catch (jsonError) {
            // Если сериализация не удалась, логируем базовую информацию об объекте
            if (typeof obj === 'object' && obj !== null) {
              try {
                // Логируем только ключи объекта
                frontendLogger.info('Object keys:', Object.keys(obj));
              } catch (keysError) {
                frontendLogger.info('Failed to log object keys');
              }
            }
          }
        } catch (logError) {}
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
        
        // Отладка уже обрабатывается в предыдущем блоке
        
        // Отладка запросов UNI фарминга
        if (uniFarmingResponse) {
          safeLogObject('[DEBUG] UNI Farming Response', uniFarmingResponse);
        }
      } catch (debugError) {}
      
      // Обработка данных UNI фарминга с проверкой структуры
      try {
        if (uniFarmingResponse?.success) {
          try {
            // Проверка наличия данных
            if (!uniFarmingResponse.data) {} else {
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
                  } catch (convertError) {}
                } else {}
              }
              
              // Безопасное создание даты
              let createdAt: Date;
              try {
                if (uniFarmingResponse.data.startDate) {
                  createdAt = new Date(uniFarmingResponse.data.startDate);
                  
                  // Проверка валидности даты
                  if (isNaN(createdAt.getTime())) {createdAt = new Date(); // Используем текущую дату как запасной вариант
                  }
                } else {
                  createdAt = new Date();
                }
              } catch (dateError) {createdAt = new Date();
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
              } catch (pushError) {}
            }
          } catch (dataError) {}
        } else if (uniFarmingResponse !== undefined) {}
      } catch (farmingError) {}
      
      // Добавляем активные TON Boost пакеты с защитой от ошибок
      try {
        if (activeTonBoostsResponse?.success && Array.isArray(activeTonBoostsResponse.data)) {activeTonBoostsResponse.data.forEach((tonBoost: TonBoostDeposit, index: number) => {
            try {
              // Проверка валидности буста
              if (!tonBoost || typeof tonBoost !== 'object') {return; // Пропускаем невалидные бусты
              }
              
              // Безопасное получение ID пакета
              const packageId = tonBoost.boost_package_id || 1;
              
              // Безопасное создание даты
              let createdAt: Date;
              try {
                if (tonBoost.created_at) {
                  createdAt = new Date(tonBoost.created_at);
                  // Проверка валидности даты
                  if (isNaN(createdAt.getTime())) {createdAt = new Date();
                  }
                } else {
                  createdAt = new Date();
                }
              } catch (dateError) {createdAt = new Date();
              }
              
              // Безопасное получение оставшихся дней
              const daysLeft = tonBoost.days_left !== undefined && 
                typeof tonBoost.days_left === 'number' && 
                isFinite(tonBoost.days_left) ? tonBoost.days_left : 365;
              
              // Безопасное добавление депозита
              farmingDeposits.push({
                id: 4000000 + index, // Используем диапазон ID для TON Boost
                packageId,
                createdAt,
                isActive: true,
                uniYield: "0.0%",
                tonYield: getYieldRateForBoost(packageId),
                bonus: getBoostBonus(packageId),
                amount: tonBoost.amount || "0",
                daysLeft
              });} catch (tonBoostError) {}
          });
        } else {}
      } catch (tonBoostsError) {}
      
      // Проверка и логирование структуры транзакций// Обработка транзакций - новая логика для поддержки API-формата
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
      
      // Логирование для отладки массива транзакций// Дополнительно логируем количество TON транзакций для отладки
      try {
        const tonTransactionsCount = transactionsArray.filter(tx => tx && tx.currency === 'TON').length;if (tonTransactionsCount > 0) {}
      } catch (debug_error) {}
      
      if (transactionsArray.length > 0) {
        // Фильтрация всех транзакций (включая TON и UNI)
        try {
          const farmingTransactions = transactionsArray.filter((tx: Transaction) => {
            try {
              return tx !== null && 
                     typeof tx === 'object' && 
                     tx.type !== 'debug' && 
                     (tx.currency === 'UNI' || tx.currency === 'TON') && 
                     ['deposit', 'farming', 'check-in', 'reward', 'farming_reward', 'ton_boost', 'boost_farming', 'ton_farming_reward', 'boost', 'boost_bonus'].includes(tx.type);
            } catch (filterItemError) {return false;
            }
          });
          
          // Логирование для отладки фильтрованных транзакций фарминга// Находим все UNI депозиты для создания карточек фарминг-депозитов
          const uniDeposits = transactionsArray.filter((tx: Transaction) => {
            try {
              return tx && typeof tx === 'object' && 
                     tx.type === 'deposit' && 
                     tx.currency === 'UNI' && 
                     tx.status === 'confirmed';
            } catch (filterUniError) {return false;
            }
          });
          
          // Создаем фарминг-депозиты из депозитов UNI
          if (uniDeposits.length > 0) {
            try {
              // Сортируем по дате (сначала новые)
              uniDeposits.sort((a, b) => {
                try {
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                } catch (sortError) {return 0;
                }
              });
              
              // Добавляем каждый депозит как отдельный фарминг-депозит
              uniDeposits.forEach((deposit) => {
                try {
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
                } catch (depositError) {}
              });
            } catch (uniDepositsError) {}
          }
          
          if (farmingTransactions.length > 0) {
            // Если у нас есть UNI фарминг, уточняем его дату активации из транзакции
            if (farmingDeposits.length > 0) {
              try {
                // Ищем первый депозит UNI для уточнения даты активации
                const depositTx = farmingTransactions.find((tx: Transaction) => 
                  tx && typeof tx === 'object' && tx.type === 'deposit' && tx.currency === 'UNI'
                );
                
                if (depositTx) {
                  // Обновляем дату создания для фарминг-депозита
                  try {
                    farmingDeposits[0].createdAt = new Date(depositTx.created_at);
                  } catch (dateUpdateError) {}
                }
              } catch (depositTxError) {}
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
                    if (!tx || typeof tx !== 'object') {return null;
                    }
                    
                    // Проверка наличия ключевых полей
                    if (!('id' in tx) || !('created_at' in tx)) {return null;
                    }
                    
                    // Определение типа операции на основе данных транзакции с защитой от undefined
                    let type = 'Операция';
                    
                    // Проверка типа транзакции
                    const txType = tx.type || '';
                    
                    // Используем все доступные типы транзакций с проверкой на существование
                    if (txType === 'farming') type = 'Фарминг';
                    else if (txType === 'farming_reward') type = 'Награда за фарминг';
                    else if (txType === 'boost_farming') type = 'TON фарминг';
                    else if (txType === 'ton_farming_reward') type = 'Награда за TON фарминг';
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
                          if (isNaN(amount)) {amount = 0;
                          }
                        } else if (typeof tx.amount === 'number') {
                          // Если уже число, просто используем
                          amount = tx.amount;
                          
                          // Проверка на Infinity или NaN
                          if (!isFinite(amount)) {amount = 0;
                          }
                        } else {amount = 0;
                        }
                      }
                    } catch (parseError) {amount = 0;
                    }
                    
                    // Безопасное создание даты
                    let transactionTime: Date;
                    try {
                      if (tx.created_at) {
                        transactionTime = new Date(tx.created_at);
                        
                        // Проверка валидности даты
                        if (isNaN(transactionTime.getTime())) {transactionTime = new Date(); // Используем текущую дату как запасной вариант
                        }
                      } else {transactionTime = new Date();
                      }
                    } catch (dateError) {transactionTime = new Date();
                    }
                    
                    // Отладочное логирование для TON транзакций с защитой от ошибок
                    if (currency === 'TON') {
                      try {// Для TON транзакций установим более низкий порог значимости
                        if (typeof amount === 'number' && amount > 0.0000001) {}
                      } catch (logError) {}
                    }
                    
                    // Создаем объект истории
                    return {
                      id: tx.id,
                      time: transactionTime,
                      type,
                      amount,
                      currency,
                      boost_package_id: tx.boost_package_id,
                      isNew: false
                    };
                  } catch (mapError) {return null; // Пропускаем проблемные транзакции
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
                    } catch (amountError) {isSignificant = false;
                    }
                    
                    // Особая обработка для транзакций TON
                    if (item.currency === 'TON') {
                      // Для TON используем более низкий порог значимости
                      const isTonSignificant = typeof item.amount === 'number' && 
                        isFinite(item.amount) && 
                        item.amount > 0.0000001;
                      
                      if (!isTonSignificant) {} else {}
                      
                      // Для TON принимаем транзакции с любой положительной суммой
                      return isTonSignificant;
                    }
                    
                    // Для других валют используем стандартный порог
                    return isSignificant;
                  } catch (filterError) {
        return false; // В случае ошибки фильтрации пропускаем транзакцию
                  }
                }) as FarmingHistory[]; // Приведение типа после фильтрации null-значений
            } catch (processError) {historyItems = []; // Используем пустой массив в случае критической ошибки
            }
            
            // Сортируем по дате (сначала новые)
            try {
              historyItems.sort((a, b) => b.time.getTime() - a.time.getTime());
            } catch (sortError) {}
            
            // Добавляем активные TON бусты в депозиты с защитой от ошибок
            try {
              if (activeTonBoostsResponse?.success && Array.isArray(activeTonBoostsResponse.data) && activeTonBoostsResponse.data.length > 0) {
                activeTonBoostsResponse.data.forEach((boost: { boost_package_id: number; created_at: string; days_left: number }, index: number) => {
                  try {
                    // Проверка валидности буста
                    if (!boost || typeof boost !== 'object') {return; // Пропускаем невалидные бусты
                    }
                    
                    // Безопасное получение ID пакета
                    const packageId = boost.boost_package_id || 1;
                    
                    // Безопасный поиск транзакции
                    let boostTx: Transaction | undefined;
                    try {
                      boostTx = farmingTransactions.find((tx: Transaction) => 
                        tx && typeof tx === 'object' && tx.type === 'boost' && tx.boost_package_id === packageId
                      );
                    } catch (findError) {boostTx = undefined;
                    }
                    
                    // Безопасное создание даты
                    let createdAt: Date;
                    try {
                      // Определяем приоритет источников даты
                      const dateSource = boostTx?.created_at || boost.created_at;
                      
                      if (dateSource) {
                        createdAt = new Date(dateSource);
                        // Проверка валидности даты
                        if (isNaN(createdAt.getTime())) {createdAt = new Date(); // Используем текущую дату как запасной вариант
                        }
                      } else {
                        createdAt = new Date();
                      }
                    } catch (dateError) {createdAt = new Date();
                    }
                    
                    // Безопасное добавление депозита
                    try {
                      // Получаем информацию о доходности буста с защитой от ошибок
                      let tonYield = "0.0%";
                      let boostBonus = "0 UNI";
                      try {
                        tonYield = getYieldRateForBoost(packageId);
                        boostBonus = getBoostBonus(packageId);
                      } catch (yieldError) {}
                      
                      // Безопасное получение оставшихся дней
                      const daysLeft = boost.days_left !== undefined && typeof boost.days_left === 'number' && isFinite(boost.days_left) 
                        ? boost.days_left 
                        : 365;
                      
                      // Безопасное получение суммы
                      let amount = "0";
                      try {
                        if (boostTx && boostTx.amount !== undefined) {
                          if (typeof boostTx.amount === 'string') {
                            amount = boostTx.amount;
                          } else if (typeof boostTx.amount === 'number') {
                            amount = String(boostTx.amount);
                          }
                        }
                      } catch (amountError) {}
                      
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
                    } catch (pushError) {}
                  } catch (boostError) {}
                });
              }
            } catch (boostsError) {}
            
            // Добавляем исторические boost транзакции для TON Boost с защитой от ошибок
            try {
              // Безопасная фильтрация транзакций буста
              const boostTransactions = (() => {
                try {
                  return farmingTransactions.filter((tx: Transaction) => {
                    try {
                      // Проверка валидности транзакции
                      if (!tx || typeof tx !== 'object') return false;
                      
                      // Проверка типа и валюты - включая TON фарминг
                      return (tx.type === 'boost' || tx.type === 'ton_boost' || tx.type === 'ton_farming_reward') && tx.currency === 'TON';
                    } catch (txError) {return false;
                    }
                  });
                } catch (filterError) {return [];
                }
              })();
              
              // Логирование для отладки
              try {} catch (logError) {}
              
              // Обработка каждой транзакции с защитой от ошибок
              boostTransactions.forEach((tx: Transaction, index: number) => {
                try {
                  // Проверка валидности буст-транзакции
                  if (!tx || typeof tx !== 'object' || !tx.boost_package_id) {return;
                  }
                  
                  // Безопасная проверка, не добавлен ли уже этот буст как активный
                  let isAlreadyActive = false;
                  try {
                    isAlreadyActive = farmingDeposits.some(d => {
                      try {
                        return d && typeof d === 'object' && d.packageId === tx.boost_package_id && d.id >= 2000000;
                      } catch (checkError) {return false;
                      }
                    });
                  } catch (someError) {isAlreadyActive = false;
                  }
                  
                  // Добавляем только если еще не активен и имеет ID буста
                  if (!isAlreadyActive && tx.boost_package_id) {
                    try {
                      // Безопасное создание даты
                      let createdAt: Date;
                      try {
                        if (tx.created_at) {
                          createdAt = new Date(tx.created_at);
                          // Проверка валидности даты
                          if (isNaN(createdAt.getTime())) {createdAt = new Date(); // Используем текущую дату как запасной вариант
                          }
                        } else {createdAt = new Date();
                        }
                      } catch (dateError) {createdAt = new Date();
                      }
                      
                      // Получаем информацию о доходности и бонусе с защитой от ошибок
                      let tonYield = "0.0%";
                      let boostBonus = "0 UNI";
                      try {
                        tonYield = getYieldRateForBoost(tx.boost_package_id);
                        boostBonus = getBoostBonus(tx.boost_package_id);
                      } catch (rateError) {}
                      
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
                      } catch (amountError) {}
                      
                      // Добавляем исторический буст в депозиты
                      farmingDeposits.push({
                        id: 3000000 + index,
                        packageId: tx.boost_package_id,
                        createdAt,
                        isActive: false, // Исторические бусты не активны
                        uniYield: "0.0%",
                        tonYield,
                        bonus: boostBonus,
                        amount,
                        daysLeft: 0
                      });
                    } catch (pushError) {}
                  }
                } catch (txProcessError) {}
              });
            } catch (boostTxsError) {}
          }
        } catch (farmingTransactionsError) {}
      }
      
      // Устанавливаем данные для отображения
      setFarmingHistory(historyItems);
      setDeposits(farmingDeposits);
      setOpacity(1);
      setTranslateY(0);
    } catch (error: any) {// В случае ошибки, устанавливаем пустые данные
      setFarmingHistory([]);
      setDeposits([]);
    } finally {
      // Всегда убираем состояние загрузки
      setIsLoading(false);
    }
  }, [transactionsResponse, activeTonBoostsResponse, uniFarmingResponse]);
  
  // Функция для получения доходности буста по его ID
  // Функция получения ставки доходности для TON буста с защитой от ошибок
  const getYieldRateForBoost = (boostId: number): string => {
    try {
      // Проверка валидности входного параметра
      if (boostId === undefined || boostId === null || isNaN(boostId)) {return '0.0%'; // Безопасное значение по умолчанию
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
      
      if (yield_rate === undefined) {return '0.0%';
      }
      
      return yield_rate;
    } catch (error) {return '0.0%'; // Безопасное значение при любой ошибке
    }
  };
  
  // Функция для получения бонуса буста по его ID с защитой от ошибок
  const getBoostBonus = (boostId: number): string => {
    try {
      // Проверка валидности входного параметра
      if (boostId === undefined || boostId === null || isNaN(boostId)) {return '0 UNI'; // Безопасное значение по умолчанию
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
      
      if (bonus === undefined) {return '0 UNI';
      }
      
      return bonus;
    } catch (error) {return '0 UNI'; // Безопасное значение при любой ошибке
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
      if (!date) {return '-- --- ----, --:--';
      }
      
      // Проверка, что дата является объектом Date
      if (!(date instanceof Date)) {try {
          // Попытка преобразовать в Date
          const newDate = new Date(date as any);
          if (isNaN(newDate.getTime())) {
            throw new Error('Невалидная дата после преобразования');
          }
          date = newDate;
        } catch (conversionError) {return '-- --- ----, --:--';
        }
      }
      
      // Проверка валидности даты
      if (isNaN(date.getTime())) {return '-- --- ----, --:--';
      }
      
      // Безопасное форматирование с применением locale
      try {
        return format(date, 'd MMM yyyy, HH:mm', { locale: ru });
      } catch (formatError) {// Запасной вариант без locale
        try {
          return date.toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        } catch (localeError) {// Самый базовый вариант, если все остальные не сработали
          try {
            return date.toLocaleDateString('ru-RU') + ', ' + 
              date.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
          } catch (fallbackError) {return date.toString(); // Самый низкоуровневый формат как последний вариант
          }
        }
      }
    } catch (error) {return '-- --- ----, --:--';
    }
  };
  
  // Вспомогательные функции для безопасного форматирования сумм
  // Используем getOptimalDecimals из глобальных утилит форматирования
  // Функция перенесена в utils/formatters.ts для унификации логики форматирования
  // по всему приложению
  
  // Используем глобальную функцию safeFormatAmount из utils/formatters.ts
  // Это упрощает поддержку кода и уменьшает риск возникновения ошибок
  
  // Рендер вкладки с депозитами
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
          } catch (itemError) {return false;
          }
        }).length > 0;
      } catch (filterError) {
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
          
          {/* КНОПКА "НАЧАТЬ ФАРМИНГ" УДАЛЕНА ПО ТРЕБОВАНИЮ */}
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {/* Отображаем только историю транзакций UNI фарминга */}
        <div className="mt-6 pt-6 border-t border-gray-800/30">
          <h3 className="text-md font-medium mb-4">История UNI фарминга</h3>
          
          <div className="overflow-auto relative max-h-[400px] scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900/20">
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
                        // Добавляем отладочную информацию для TON транзакций
                        const isTon = item.currency === 'TON';
                        if (isTon) {}
                        return isTon;
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
                                item.type === 'Награда за TON фарминг' ? 'bg-amber-500' : 
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
                                // Используем форматирование
                                return formatAmount(item.amount, item.currency);
                              } catch (error) {// Безопасное значение по умолчанию
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
        // Подсчитываем количество TON транзакций для отладки
        const tonTransactions = farmingHistory.filter(item => {
          try {
            return item.currency === 'TON';
          } catch (e) {
            return false;
          }
        });
        
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
            } catch (amountError) {hasSignificantAmount = false;
            }
            
            return isTonCurrency && hasSignificantAmount;
          } catch (itemError) {return false;
          }
        }).length > 0;
      } catch (filterError) {
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
          
          <div className="overflow-auto relative max-h-[400px] scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900/20">
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
                              // Используем форматирование для TON
                              return formatAmount(item.amount, 'TON');
                            } catch (error) {// Безопасное значение по умолчанию
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
        refetchTonBoosts(),
        refetchFarming()
      ]);
      
      // Данные будут автоматически обработаны через useEffect,
      // когда обновятся transactionsResponse, activeTonBoostsResponse и uniFarmingResponse
    } catch (err) {} finally {
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