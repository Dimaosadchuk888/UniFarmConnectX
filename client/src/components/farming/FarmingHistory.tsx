import React, { useState, useEffect } from 'react';
import { BOOST_PACKAGES } from '@/lib/constants';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Типы и интерфейсы
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

interface FarmingHistory {
  id: number;
  time: Date;
  type: string;
  amount: number;
  currency: string;
  boost_id?: number;
  isNew?: boolean;
}

// Интерфейс для API ответа
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// Интерфейс для транзакций из API
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

const FarmingHistoryComponent: React.FC = () => {
  // Состояния
  const [activeTab, setActiveTab] = useState<'uni' | 'ton'>('uni');
  const [opacity, setOpacity] = useState(0);
  const [translateY, setTranslateY] = useState(20);
  const [deposits, setDeposits] = useState<FarmingDeposit[]>([]);
  const [farmingHistory, setFarmingHistory] = useState<FarmingHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Фиксированный UserID для демонстрации
  const userId = 1;
  
  // Получаем транзакции из API
  const { data: transactionsResponse } = useQuery<ApiResponse<Transaction[]>>({
    queryKey: [`/api/transactions?user_id=${userId}`],
  });
  
  // Получаем активные бусты из API
  const { data: activeBoostsResponse } = useQuery<ApiResponse<any[]>>({
    queryKey: [`/api/boosts/active?user_id=${userId}`],
  });
  
  // Получаем информацию о UNI фарминге из API
  const { data: uniFarmingResponse } = useQuery<ApiResponse<any>>({
    queryKey: [`/api/uni-farming/info?user_id=${userId}`],
  });
  
  // Эффект для загрузки реальных данных из API
  useEffect(() => {
    if (transactionsResponse?.success && Array.isArray(transactionsResponse.data)) {
      // Создаем записи истории фарминга на основе транзакций
      const farmingTransactions = transactionsResponse.data.filter(tx => 
        tx.type === 'farming_start' || tx.type === 'farming_deposit' || tx.type === 'boost_purchase'
      );
      
      // Преобразуем транзакции в историю
      const historyItems: FarmingHistory[] = farmingTransactions.map(tx => ({
        id: tx.id,
        time: new Date(tx.created_at),
        type: tx.type === 'boost_purchase' ? 'Boost' : 'Фарминг',
        amount: parseFloat(tx.amount || '0'),
        currency: tx.type === 'boost_purchase' ? 'TON' : 'UNI',
        boost_id: tx.boost_id,
        isNew: false
      }));
      
      // Сортируем по дате (сначала новые)
      historyItems.sort((a, b) => b.time.getTime() - a.time.getTime());
      
      // Формируем массив депозитов на основе данных о бустах и фарминге
      const farmingDeposits: FarmingDeposit[] = [];
      
      // Данные UNI фарминга
      const uniFarmingTx = farmingTransactions.find(tx => 
        tx.type === 'farming_start' || tx.type === 'farming_deposit'
      );
      
      // Добавляем UNI депозит, если есть активный фарминг
      // Используем данные как из API, так и из транзакции
      if (uniFarmingResponse?.success && uniFarmingResponse.data?.isActive) {
        farmingDeposits.push({
          id: 1000000,
          packageId: 0, // Основной UNI пакет
          createdAt: uniFarmingTx ? new Date(uniFarmingTx.created_at) : new Date(),
          isActive: true,
          uniYield: "0.5%",
          tonYield: "0.0%",
          bonus: "0",
          amount: uniFarmingResponse.data.depositAmount || "0",
          daysLeft: 365
        });
      }
      
      // Добавляем активные бусты в депозиты
      if (activeBoostsResponse?.success && Array.isArray(activeBoostsResponse.data) && activeBoostsResponse.data.length > 0) {
        activeBoostsResponse.data.forEach((boost, index) => {
          const packageId = boost.boost_id || 1;
          
          // Находим соответствующую транзакцию для этого буста
          const boostTx = farmingTransactions.find(tx => 
            tx.type === 'boost_purchase' && tx.boost_id === packageId
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
      
      // Добавляем исторические boost транзакции, которые не в активных бустах
      // для полной истории в разделе TON Boost
      const boostTransactions = farmingTransactions.filter(tx => tx.type === 'boost_purchase');
      
      boostTransactions.forEach((tx, index) => {
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
      
      setFarmingHistory(historyItems);
      setDeposits(farmingDeposits);
      setIsLoading(false);
      setOpacity(1);
      setTranslateY(0);
    }
  }, [transactionsResponse, activeBoostsResponse, uniFarmingResponse]);
  
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
  
  // Убираем эффект для периодического добавления новых начислений, так как его больше не нужно
  
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
              {farmingHistory.filter(item => item.currency === 'UNI').length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-foreground opacity-70">
                    История транзакций пуста
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
                      .filter(item => item.currency === 'UNI')
                      .map((item) => (
                        <tr 
                          key={item.id} 
                          className="border-b border-gray-800/30 transition-all duration-300 hover:bg-black/20"
                        >
                          <td className="py-2 text-sm">{formatDate(item.time)}</td>
                          <td className="py-2 text-sm">
                            <div className="flex items-center">
                              <i className="fas fa-seedling text-xs text-green-400 mr-2"></i>
                              Активация фарминга
                            </div>
                          </td>
                          <td className="py-2 text-sm text-right">
                            <div className="flex items-center justify-end">
                              <span className="text-purple-300">+{item.amount.toFixed(item.amount < 0.001 ? 7 : 2)}</span>
                              <span className="text-gray-400 ml-1.5 text-xs">UNI</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Рендер вкладки с TON буст пакетами
  const renderHistoryTab = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-opacity-50 border-t-primary rounded-full"></div>
        </div>
      );
    }
    
    // Фильтруем депозиты, чтобы показать только TON буст пакеты (packageId > 0)
    const tonDeposits = deposits.filter(d => d.packageId > 0);
    
    if (tonDeposits.length === 0 && farmingHistory.filter(item => item.currency === 'TON').length === 0) {
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
            У вас пока нет активных TON буст пакетов
          </p>
          
          <p className="text-sm text-foreground opacity-50 max-w-sm mx-auto">
            Купите Boost, чтобы начать зарабатывать TON
          </p>
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
          {tonDeposits.length > 0 && (
            <div>
              <h3 className="text-md font-medium mb-4">Активные TON Boost</h3>
              
              <div className="space-y-4">
                {tonDeposits.map((deposit) => (
                  <div 
                    key={deposit.id} 
                    className={`
                      rounded-xl p-4 transition-all duration-300
                      ${deposit.isActive ? 'bg-blue-900/10 border border-blue-400/40' : 'bg-card'}
                      ${deposit.isActive ? 'shadow-[0_0_15px_rgba(109,191,255,0.15)]' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center mb-1">
                          <i className={`fas fa-rocket text-sm text-blue-400 mr-2`}></i>
                          <h3 className="font-medium">{getPackageTypeString(deposit)}</h3>
                        </div>
                        <p className="text-xs text-foreground opacity-70 mb-2">
                          Дата покупки: {formatDate(deposit.createdAt)}
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
                        <div className="flex flex-col">
                          <div className="flex items-center mt-1">
                            <span className="text-blue-400">
                              {deposit.tonYield === "0.0%" ? (
                                <span className="text-gray-400">0</span>
                              ) : (
                                <>+{(parseFloat(deposit.tonYield) * 100 * 86400 / 10000).toFixed(4)}</>
                              )}
                            </span>
                            <span className="text-gray-400 ml-1.5 text-xs">TON</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs text-foreground opacity-70 mb-1">Доход в секунду</p>
                        <div className="flex flex-col">
                          <div className="flex items-center mt-1">
                            <span className="text-blue-400">
                              {deposit.tonYield === "0.0%" ? (
                                <span className="text-gray-400">0</span>
                              ) : (
                                <>+{(parseFloat(deposit.tonYield) * 100 / 10000 / 86400).toFixed(8)}</>
                              )}
                            </span>
                            <span className="text-gray-400 ml-1.5 text-xs">TON</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <div className="flex items-center">
                        <i className="fas fa-gift text-blue-400/70 mr-2"></i>
                        <p className="text-sm">
                          <span className="text-foreground opacity-70">Бонус: </span>
                          <span className="text-accent">{deposit.bonus}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Отображаем историю транзакций TON буст пакетов */}
          <div className="mt-6 pt-6 border-t border-gray-800/30">
            <h3 className="text-md font-medium mb-4">История TON Boost</h3>
            
            <div className="overflow-hidden relative">
              {farmingHistory.filter(item => item.currency === 'TON').length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-foreground opacity-70">
                    История транзакций пуста
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
                          className="border-b border-gray-800/30 transition-all duration-300 hover:bg-black/20"
                        >
                          <td className="py-2 text-sm">{formatDate(item.time)}</td>
                          <td className="py-2 text-sm">
                            <div className="flex items-center">
                              <i className="fas fa-rocket text-xs text-blue-400 mr-2"></i>
                              Покупка Boost
                            </div>
                          </td>
                          <td className="py-2 text-sm text-right">
                            <div className="flex items-center justify-end">
                              <span className="text-blue-400">+{item.amount.toFixed(item.amount < 0.001 ? 7 : 4)}</span>
                              <span className="text-gray-400 ml-1.5 text-xs">TON</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              )}
            </div>
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
          onClick={() => {
            // Обновление данных путем повторного запроса к API
            setIsLoading(true);
            
            // Делаем новые запросы к API с обновленным временем
            fetch(`/api/transactions?user_id=${userId}&t=${Date.now()}`)
              .then(res => res.json())
              .then(data => {
                if (data.success && Array.isArray(data.data)) {
                  // Создаем записи истории фарминга на основе транзакций
                  const farmingTransactions = data.data.filter((tx: Transaction) => 
                    tx.type === 'farming_start' || tx.type === 'farming_deposit' || tx.type === 'boost_purchase'
                  );
                  
                  // Преобразуем транзакции в историю
                  const historyItems: FarmingHistory[] = farmingTransactions.map((tx: Transaction) => ({
                    id: tx.id,
                    time: new Date(tx.created_at),
                    type: tx.type === 'boost_purchase' ? 'Boost' : 'Фарминг',
                    amount: parseFloat(tx.amount),
                    currency: tx.type === 'boost_purchase' ? 'TON' : 'UNI',
                    isNew: false
                  }));
                  
                  // Сортируем по дате (сначала новые)
                  historyItems.sort((a, b) => b.time.getTime() - a.time.getTime());
                  
                  setFarmingHistory(historyItems);
                }
                setIsLoading(false);
              })
              .catch(err => {
                console.error("Ошибка обновления данных:", err);
                setIsLoading(false);
              });
          }}
        >
          <i className="fas fa-sync-alt mr-1"></i> Обновить
        </button>
      </div>
      
      <div 
        className="bg-card rounded-xl p-4 shadow-lg card-hover-effect relative overflow-hidden"
        style={{
          transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        {/* Декоративные частицы для визуального интереса */}
        {particles.map((particle) => (
          <div 
            key={particle.id}
            className="absolute rounded-full bg-primary/10 float-animation"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              top: `${particle.top}%`,
              left: `${particle.left}%`,
              animationDuration: `${particle.animationDuration}s`,
              filter: `blur(${particle.blurAmount}px)`,
              opacity: 0.5,
              animationDelay: `${particle.id * 0.5}s`
            }}
          ></div>
        ))}
        
        {/* Навигация по вкладкам */}
        <div className="flex space-x-2 mb-4 relative z-10">
          <button
            className={`
              px-4 py-2 rounded-lg text-sm font-medium
              transition-all duration-300
              ${activeTab === 'uni' 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-muted text-foreground/70 hover:bg-muted/70'}
            `}
            onClick={() => setActiveTab('uni')}
          >
            <i className="fas fa-seedling mr-2"></i>
            UNI Фарминг
          </button>
          <button
            className={`
              px-4 py-2 rounded-lg text-sm font-medium
              transition-all duration-300
              ${activeTab === 'ton' 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-muted text-foreground/70 hover:bg-muted/70'}
            `}
            onClick={() => setActiveTab('ton')}
          >
            <i className="fas fa-rocket mr-2"></i>
            TON Boost
          </button>
        </div>
        
        {/* Содержимое вкладок */}
        <div className="min-h-[200px] relative">
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

export default FarmingHistoryComponent;