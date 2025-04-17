import React, { useState, useEffect } from 'react';
import { BOOST_PACKAGES } from '@/lib/constants';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

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
      const response = await fetch(`/api/transactions?user_id=${validUserId}`);
      
      if (!response.ok) {
        throw new Error(`Ошибка получения транзакций: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: !!validUserId, // Выполняем запрос только если userId определен
  });
  
  // Запрос на получение активных буст-пакетов
  const { data: activeBoostsResponse, refetch: refetchBoosts } = useQuery({
    queryKey: ['/api/boosts/active', { user_id: validUserId }],
    enabled: !!validUserId,
  });
  
  // Запрос информации о UNI фарминге
  const { data: uniFarmingResponse, refetch: refetchFarming } = useQuery({
    queryKey: ['/api/uni-farming/info', { user_id: validUserId }],
    enabled: !!validUserId,
  });
  
  // Обработка полученных данных
  useEffect(() => {
    setIsLoading(true);
    
    const farmingDeposits: FarmingDeposit[] = [];
    let historyItems: FarmingHistory[] = [];
    
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
    
    // Обработка транзакций
    if (Array.isArray(transactionsResponse)) {
      // Фильтрация транзакций UNI
      const farmingTransactions = transactionsResponse.filter((tx: Transaction) => 
        tx.type !== 'debug' && 
        tx.currency === 'UNI' && 
        ['deposit', 'farming', 'check-in', 'reward'].includes(tx.type)
      );
      
      // Находим все UNI депозиты для создания карточек фарминг-депозитов
      const uniDeposits = transactionsResponse.filter((tx: Transaction) => 
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
        
        // Преобразуем транзакции в историю
        historyItems = farmingTransactions.map((tx: Transaction) => {
          // Определение типа операции на основе данных транзакции
          let type = 'Операция';
          
          // Используем все доступные типы транзакций
          if (tx.type === 'farming') type = 'Фарминг';
          else if (tx.type === 'deposit') type = 'Депозит';
          else if (tx.type === 'boost') type = 'Boost';
          else if (tx.type === 'check-in') type = 'Ежедневный бонус';
          else if (tx.type === 'reward') type = 'Награда';
          
          return {
            id: tx.id,
            time: new Date(tx.created_at),
            type,
            amount: parseFloat(tx.amount || '0'),
            currency: tx.currency || 'UNI', // По умолчанию UNI
            boost_id: tx.boost_id,
            isNew: false
          };
        });
        
        // Сортируем по дате (сначала новые)
        historyItems.sort((a, b) => b.time.getTime() - a.time.getTime());
        
        // Добавляем активные бусты в депозиты, если они есть
        if (activeBoostsResponse?.success && Array.isArray(activeBoostsResponse.data) && activeBoostsResponse.data.length > 0) {
          activeBoostsResponse.data.forEach((boost, index) => {
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
  }, [transactionsResponse, activeBoostsResponse, uniFarmingResponse, isLoading]);
  
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
    
    // Фильтруем депозиты, чтобы показать только UNI фарминг (packageId = 0)
    const uniDeposits = deposits.filter(d => d.packageId === 0);
    
    if (uniDeposits.length === 0) {
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
            У вас пока нет активного UNI фарминга
          </p>
          
          <p className="text-sm text-foreground opacity-50 max-w-sm mx-auto">
            Откройте фарминг, чтобы начать зарабатывать UNI
          </p>
          
          <button className="mt-6 gradient-button text-white px-4 py-2 rounded-lg font-medium transition-transform hover:scale-105">
            Начать фарминг
          </button>
        </div>
      );
    }
    
    return (
      <div className="overflow-hidden relative">
        {/* Эффект затухания вверху и внизу для скролла */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent z-10 pointer-events-none"></div>
        
        {/* Блок для скрытия белой полосы справа */}
        <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-card z-20"></div>
        
        <div className="space-y-4 max-h-[350px] overflow-y-auto overflow-x-hidden farming-history-scroll">
          {uniDeposits.map((deposit) => (
            <div 
              key={deposit.id} 
              className={`
                rounded-xl p-4 transition-all duration-300
                ${deposit.isActive ? 'bg-primary/10 border border-primary/40' : 'bg-card'}
                ${deposit.isActive ? 'shadow-[0_0_15px_rgba(162,89,255,0.15)]' : ''}
              `}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center mb-1">
                    <i className="fas fa-seedling text-sm text-purple-300 mr-2"></i>
                    <h3 className="font-medium">Основной UNI пакет ({deposit.uniYield})</h3>
                  </div>
                  <p className="text-xs text-foreground opacity-70 mb-2">
                    Дата активации: {formatDate(deposit.createdAt)}
                  </p>
                </div>
                <div>
                  <span 
                    className={`
                      inline-block px-2 py-1 text-xs rounded-full
                      ${deposit.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}
                    `}
                  >
                    {deposit.isActive ? `Активен (${deposit.daysLeft} дн.)` : 'Завершён'}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <p className="text-xs text-foreground opacity-70 mb-1">Доход в сутки</p>
                  <div className="flex items-center">
                    <span className="text-purple-300">+{(parseFloat("0.5") * 100 * 86400 / 100).toFixed(2)}</span>
                    <span className="text-gray-400 ml-1.5 text-xs">UNI</span>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs text-foreground opacity-70 mb-1">Доход в секунду</p>
                  <div className="flex items-center">
                    <span className="text-purple-300">+0.00029</span>
                    <span className="text-gray-400 ml-1.5 text-xs">UNI</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Отображаем историю транзакций UNI фарминга */}
          <div className="mt-6 pt-6 border-t border-gray-800/30">
            <h3 className="text-md font-medium mb-4">История UNI фарминга</h3>
            
            <div className="overflow-hidden relative">
              {farmingHistory.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-foreground opacity-70">
                    У вас пока нет транзакций по фармингу UNI
                  </p>
                </div>
              ) : (
                <>
                  
                  <table className="w-full">
                    <thead className="sticky top-0 bg-card z-10">
                      <tr className="border-b border-gray-800">
                        <th className="py-2 text-left text-sm text-foreground opacity-70">Дата и время</th>
                        <th className="py-2 text-left text-sm text-foreground opacity-70">Операция</th>
                        <th className="py-2 text-right text-sm text-foreground opacity-70">Сумма</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* ВАЖНО: Здесь убрана дополнительная фильтрация по UNI - это может быть причиной проблемы */}
                      {farmingHistory.map((item) => (
                        <tr 
                          key={item.id} 
                          className={`border-b border-gray-800/30 ${item.isNew ? 'animate-highlight' : ''}`}
                        >
                          <td className="py-2 text-sm text-foreground opacity-70">{formatDate(item.time)}</td>
                          <td className="py-2 text-sm text-foreground">{item.type}</td>
                          <td className="py-2 text-sm text-right">
                            <span className={item.currency === 'UNI' ? "text-purple-300" : "text-blue-300"}>
                              +{item.amount.toFixed(item.amount < 0.001 ? 6 : 2)}
                            </span>
                            <span className="text-gray-400 ml-1.5 text-xs">{item.currency}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Рендер вкладки с историей TON фарминга
  const renderHistoryTab = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-opacity-50 border-t-primary rounded-full"></div>
        </div>
      );
    }
    
    // Фильтруем депозиты, чтобы показать только TON Boost (packageId > 0)
    const tonBoostDeposits = deposits.filter(d => d.packageId > 0);
    
    if (tonBoostDeposits.length === 0) {
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
            У вас пока нет TON Boost пакетов
          </p>
          
          <p className="text-sm text-foreground opacity-50 max-w-sm mx-auto">
            Купите TON Boost, чтобы повысить доходность
          </p>
          
          <button className="mt-6 gradient-button-blue text-white px-4 py-2 rounded-lg font-medium transition-transform hover:scale-105">
            Купить TON Boost
          </button>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {tonBoostDeposits.map((deposit) => (
          <div 
            key={deposit.id} 
            className={`
              rounded-xl p-4 transition-all duration-300
              ${deposit.isActive ? 'bg-blue-500/10 border border-blue-400/40' : 'bg-card'}
              ${deposit.isActive ? 'shadow-[0_0_15px_rgba(109,191,255,0.15)]' : ''}
            `}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center mb-1">
                  <i className="fas fa-rocket text-sm text-blue-300 mr-2"></i>
                  <h3 className="font-medium">{getPackageTypeString(deposit)}</h3>
                </div>
                <p className="text-xs text-foreground opacity-70 mb-2">
                  {deposit.isActive ? `Активация: ${formatDate(deposit.createdAt)}` : `Завершен: ${formatDate(deposit.createdAt)}`}
                </p>
              </div>
              <div>
                <span 
                  className={`
                    inline-block px-2 py-1 text-xs rounded-full
                    ${deposit.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}
                  `}
                >
                  {deposit.isActive ? `Активен (${deposit.daysLeft} дн.)` : 'Завершён'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <p className="text-xs text-foreground opacity-70 mb-1">Доходность</p>
                <div className="flex items-center">
                  <span className="text-blue-300">{deposit.tonYield}</span>
                  <span className="text-gray-400 ml-1.5 text-xs">в день</span>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-foreground opacity-70 mb-1">Бонус</p>
                <div className="flex items-center">
                  <span className="text-purple-300">{deposit.bonus}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Отображаем историю транзакций TON фарминга */}
        <div className="mt-6 pt-6 border-t border-gray-800/30">
          <h3 className="text-md font-medium mb-4">История TON транзакций</h3>
          
          <div className="overflow-hidden relative">
            {farmingHistory.filter(item => item.currency === 'TON').length === 0 ? (
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
                    .filter(item => item.currency === 'TON')
                    .map((item) => (
                      <tr 
                        key={item.id} 
                        className={`border-b border-gray-800/30 ${item.isNew ? 'animate-highlight' : ''}`}
                      >
                        <td className="py-2 text-sm text-foreground opacity-70">{formatDate(item.time)}</td>
                        <td className="py-2 text-sm text-foreground">{item.type}</td>
                        <td className="py-2 text-sm text-right">
                          <span className="text-blue-300">+{item.amount.toFixed(item.amount < 0.001 ? 6 : 4)}</span>
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
            renderHistoryTab()
          )}


        </div>
      </div>
    </div>
  );
};

export default FarmingHistory;