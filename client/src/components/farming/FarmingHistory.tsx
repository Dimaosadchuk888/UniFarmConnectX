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
  
  // Запрос на получение транзакций
  const { data: transactionsResponse, refetch: refetchTransactions } = useQuery({
    queryKey: ['/api/transactions', { user_id: validUserId }],
    queryFn: async () => {
      try {
        // Используем correctApiRequest вместо прямого fetch
        const result = await correctApiRequest<any>(`/api/transactions?user_id=${validUserId}`, 'GET');
        
        // Логирование для отладки
        console.log("[DEBUG] FarmingHistory - API /api/transactions response:", {
          isObject: typeof result === 'object',
          hasSuccess: result && 'success' in result,
          hasData: result && result.success && 'data' in result,
          dataStructure: result && result.success && result.data ? 
            Object.keys(result.data) : 'N/A',
          sample: result && result.success && result.data && result.data.transactions ?
            result.data.transactions.slice(0, 2) : 'N/A'
        });
        
        return result;
      } catch (error: any) {
        console.error("[ERROR] FarmingHistory - Ошибка получения транзакций:", error);
        throw new Error(`Ошибка получения транзакций: ${error.message || 'Неизвестная ошибка'}`);
      }
    },
    enabled: !!validUserId, // Выполняем запрос только если userId определен
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
  
  // Обработка полученных данных
  useEffect(() => {
    // Инициализация переменных
    const farmingDeposits: FarmingDeposit[] = [];
    let historyItems: FarmingHistory[] = [];
    
    try {
      setIsLoading(true);
      
      // Отладка запросов TON Boost
      if (activeTonBoostsResponse) {
        console.log('[DEBUG] TON Boost Response:', JSON.stringify(activeTonBoostsResponse).slice(0, 500));
      }
    
    // Создаем основной депозит из данных фарминга
    if (uniFarmingResponse?.success) {
      // Проверка существующего активного депозита
      const isActive = uniFarmingResponse.data.isActive;
      const depositAmount = uniFarmingResponse.data.depositAmount || '0';
      
      // Добавляем активный депозит из API данных
      farmingDeposits.push({
        id: 1,
        packageId: 0, // 0 значит основной UNI фарминг
        createdAt: new Date(uniFarmingResponse.data.startDate || Date.now()),
        isActive: isActive,
        uniYield: "0.5%", 
        tonYield: "0.0%",
        bonus: "0 UNI",
        amount: depositAmount,
        daysLeft: 365
      });
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
        
        // Преобразуем транзакции в историю с фильтрацией незначительных сумм
        historyItems = farmingTransactions
          .map((tx: Transaction) => {
            // Определение типа операции на основе данных транзакции
            let type = 'Операция';
            
            // Используем все доступные типы транзакций
            if (tx.type === 'farming') type = 'Фарминг';
            else if (tx.type === 'farming_reward') type = 'Награда за фарминг';
            else if (tx.type === 'boost_farming') type = 'TON фарминг';
            else if (tx.type === 'ton_boost') type = 'TON Boost';
            else if (tx.type === 'deposit') type = 'Депозит';
            else if (tx.type === 'boost') type = 'Boost';
            else if (tx.type === 'check-in') type = 'Ежедневный бонус';
            else if (tx.type === 'reward') type = 'Награда';
            
            const currency = tx.currency || 'UNI'; // По умолчанию UNI
            const amount = parseFloat(tx.amount || '0');
            
            // Отладочное логирование для TON транзакций
            if (currency === 'TON') {
              console.log("[TON История] Обработка транзакции:", {
                id: tx.id,
                time: new Date(tx.created_at),
                type: tx.type,
                rawAmount: tx.amount,
                parsedAmount: amount,
                boost_id: tx.boost_id
              });
            }
            
            return {
              id: tx.id,
              time: new Date(tx.created_at),
              type,
              amount,
              currency,
              boost_id: tx.boost_id,
              isNew: false
            };
          })
          // Фильтруем транзакции с нулевыми или слишком малыми суммами
          .filter(item => {
            const minAmount = MIN_SIGNIFICANT_AMOUNT[item.currency as keyof typeof MIN_SIGNIFICANT_AMOUNT] || 0.00001;
            const isSignificant = item.amount > minAmount;
            
            if (!isSignificant && item.currency === 'TON') {
              console.log(`[TON История] Отфильтрована незначительная транзакция: ID=${item.id}, Сумма=${item.amount}`);
            }
            
            return isSignificant;
          });
        
        // Сортируем по дате (сначала новые)
        historyItems.sort((a, b) => b.time.getTime() - a.time.getTime());
        
        // Добавляем активные бусты в депозиты, если они есть
        if (activeBoostsResponse?.success && Array.isArray(activeBoostsResponse.data) && activeBoostsResponse.data.length > 0) {
          activeBoostsResponse.data.forEach((boost: { boost_id: number; created_at: string; days_left: number }, index: number) => {
            const packageId = boost.boost_id || 1;
            
            // Находим транзакцию покупки этого буста
            const boostTx = farmingTransactions.find((tx: Transaction) => 
              tx.type === 'boost' && tx.boost_id === packageId
            );
            
            farmingDeposits.push({
              id: 2000000 + index,
              packageId,
              createdAt: boostTx ? new Date(boostTx.created_at) : new Date(boost.created_at || Date.now()),
              isActive: true,
              uniYield: "0.0%",
              tonYield: getYieldRateForBoost(packageId),
              bonus: getBoostBonus(packageId),
              amount: boostTx ? boostTx.amount : "0",
              daysLeft: boost.days_left || 365
            });
          });
        }
        
        // Добавляем исторические boost транзакции для TON Boost
        const boostTransactions = farmingTransactions.filter((tx: Transaction) => 
          tx.type === 'boost' && tx.currency === 'TON'
        );
        
        boostTransactions.forEach((tx: Transaction, index: number) => {
          // Проверяем, не добавлен ли уже этот буст как активный
          const isAlreadyActive = farmingDeposits.some(d => 
            d.packageId === tx.boost_id && 
            d.id >= 2000000
          );
          
          if (!isAlreadyActive && tx.boost_id) {
            farmingDeposits.push({
              id: 3000000 + index,
              packageId: tx.boost_id,
              createdAt: new Date(tx.created_at),
              isActive: false, // Неактивный буст
              uniYield: "0.0%",
              tonYield: getYieldRateForBoost(tx.boost_id),
              bonus: getBoostBonus(tx.boost_id),
              amount: tx.amount || "0",
              daysLeft: 0
            });
          }
        });
      }
    }
    
    // Устанавливаем данные в состояние
    
    setFarmingHistory(historyItems);
    setDeposits(farmingDeposits);
    setOpacity(1);
    setTranslateY(0);
    setIsLoading(false);
  }, [transactionsResponse, activeBoostsResponse, activeTonBoostsResponse, uniFarmingResponse, isLoading]);
  
  // Функция для получения доходности буста по его ID
  const getYieldRateForBoost = (boostId: number): string => {
    const rates: Record<number, string> = {
      1: '0.5%',
      2: '1.0%',
      3: '2.0%',
      4: '2.5%'
    };
    return rates[boostId] || '0.0%';
  };
  
  // Функция для получения бонуса буста по его ID
  const getBoostBonus = (boostId: number): string => {
    const bonuses: Record<number, string> = {
      1: '+10,000 UNI',
      2: '+75,000 UNI',
      3: '+250,000 UNI',
      4: '+500,000 UNI'
    };
    return bonuses[boostId] || '0 UNI';
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
  
  // Форматирование даты с использованием date-fns
  const formatDate = (date: Date): string => {
    return format(date, 'd MMM yyyy, HH:mm', { locale: ru });
  };
  
  // Форматирование времени с использованием date-fns
  const formatTime = (date: Date): string => {
    return format(date, 'HH:mm:ss', { locale: ru });
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
    
    // Проверяем наличие UNI транзакций
    const hasUniTransactions = farmingHistory.filter(item => 
      item.currency === 'UNI'
    ).length > 0;
    
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
                            +{item.currency === 'TON' ? 
                              // TON показываем с разной точностью в зависимости от размера суммы
                              item.amount.toFixed(item.amount < 0.001 ? 6 : 3) : 
                              // UNI показываем с разной точностью в зависимости от размера суммы
                              item.amount.toFixed(
                                item.amount < 0.0001 ? 8 : 
                                item.amount < 0.01 ? 6 : 
                                item.amount < 1 ? 4 : 2
                              )
                            }
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
  
  // Рендер вкладки с TON Boost пакетами
  // Функция для форматирования числа с заданной точностью
  const formatNumberWithPrecision = (value: number, precision: number = 2) => {
    // Проверяем, что значение существует и является числом
    if (value === undefined || value === null || isNaN(value)) {
      return "0".padEnd(precision + 2, "0");
    }
    
    // Форматируем число с заданной точностью
    const valueStr = value.toFixed(precision);
    
    // Если значение близко к нулю (меньше 0.00001), показываем "0.00000"
    if (value > 0 && value < Math.pow(10, -precision)) {
      return "0".padEnd(precision + 2, "0");
    }
    
    return valueStr;
  };

  const renderTonBoostTab = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-400 border-opacity-50 border-t-blue-400 rounded-full"></div>
        </div>
      );
    }
    
    // Проверка наличия TON транзакций
    const hasTonTransactions = farmingHistory.filter(item => 
      item.currency === 'TON' && item.amount >= 0.000001
    ).length > 0;
    
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
            {farmingHistory.filter(item => item.currency === 'TON' && item.amount >= 0.000001).length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-foreground opacity-70">
                  У вас пока нет транзакций по TON
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
                  {farmingHistory
                    .filter(item => 
                      // Фильтрация только TON транзакций со значимыми суммами
                      item.currency === 'TON' && 
                      item.amount >= 0.000001
                    )
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
                                item.type === 'Депозит' ? 'bg-blue-500' : 
                                item.type === 'Награда за фарминг' ? 'bg-blue-300' : 
                                item.type === 'TON фарминг' ? 'bg-blue-400' : 
                                item.type === 'TON Boost' ? 'bg-indigo-500' : 
                                item.type === 'Boost' ? 'bg-cyan-500' : 
                                'bg-blue-500'}
                            `}></span>
                            {item.type}
                          </div>
                        </td>
                        <td className="py-2 text-sm text-right">
                          <span className="text-blue-300">
                            +{(item.amount || 0).toFixed(
                              // Настраиваем точность отображения TON в зависимости от суммы
                              (item.amount || 0) < 0.0001 ? 6 : 
                              (item.amount || 0) < 0.01 ? 5 : 
                              (item.amount || 0) < 1 ? 4 : 3
                            )}
                          </span>
                          <span className="text-gray-400 ml-1.5 text-xs">TON</span>
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
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-white">История фарминга</h2>
        <button 
          className="text-sm text-primary hover:text-primary/80 transition-colors"
          onClick={async () => {
            // Обновление данных через react-query refetch
            setIsLoading(true);
            
            try {
              // Параллельно запускаем все refetch запросы
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
          }}
        >
          <i className="fas fa-sync-alt mr-1"></i>
          Обновить
        </button>
      </div>
      
      <div className="rounded-lg bg-card shadow-lg overflow-hidden">
        <div className="flex border-b border-gray-800">
          <button
            className={`px-4 py-3 text-sm transition-colors ${
              activeTab === 'uni' ? 'text-primary border-b-2 border-primary' : 'text-foreground opacity-70 hover:text-primary'
            }`}
            onClick={() => setActiveTab('uni')}
          >
            <i className="fas fa-seedling mr-2"></i>
            UNI Фарминг
          </button>
          
          <button
            className={`px-4 py-3 text-sm transition-colors ${
              activeTab === 'ton' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-foreground opacity-70 hover:text-blue-400'
            }`}
            onClick={() => setActiveTab('ton')}
          >
            <i className="fas fa-rocket mr-2"></i>
            TON Boost
          </button>
        </div>
        
        {/* Содержимое вкладок */}
        <div className="min-h-[200px] relative p-4">
          {activeTab === 'uni' ? (
            renderDepositsTab()
          ) : (
            renderTonBoostTab()
          )}


        </div>
      </div>
    </div>
  );
};

export default FarmingHistory;