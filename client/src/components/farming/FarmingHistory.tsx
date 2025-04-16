import React, { useState, useEffect } from 'react';
import { BOOST_PACKAGES } from '@/lib/constants';

// Типы и интерфейсы
interface FarmingDeposit {
  id: number;
  packageId: number;
  createdAt: Date;
  isActive: boolean;
  uniYield: string;
  tonYield: string;
  bonus: string;
  daysLeft: number;
}

interface FarmingHistory {
  id: number;
  time: Date;
  type: string;
  amount: number;
  currency: string;
  isNew?: boolean;
}

const FarmingHistoryComponent: React.FC = () => {
  // Состояния
  const [activeTab, setActiveTab] = useState<'deposits' | 'allocations'>('deposits');
  const [opacity, setOpacity] = useState(0);
  const [translateY, setTranslateY] = useState(20);
  const [deposits, setDeposits] = useState<FarmingDeposit[]>([]);
  const [farmingHistory, setFarmingHistory] = useState<FarmingHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Пример данных для демонстрации
  useEffect(() => {
    // Имитация загрузки данных
    setTimeout(() => {
      // Пример активных депозитов
      const mockDeposits: FarmingDeposit[] = [
        {
          id: 101,
          packageId: 3, // Ссылка на пакет из BOOST_PACKAGES
          createdAt: new Date(2025, 3, 15, 14, 30), // 15 апреля 2025
          isActive: true,
          uniYield: "2.5%",
          tonYield: "1.3%",
          bonus: "+50,000 UNI",
          daysLeft: 18
        },
        {
          id: 102,
          packageId: 1,
          createdAt: new Date(2025, 3, 1, 10, 15), // 1 апреля 2025
          isActive: false, // Закончился
          uniYield: "1%",
          tonYield: "0.5%",
          bonus: "+10,000 UNI",
          daysLeft: 0
        }
      ];
      
      // Пример истории начислений
      const currentDate = new Date();
      const mockHistory: FarmingHistory[] = Array(15).fill(0).map((_, index) => {
        const timeAgo = new Date(currentDate.getTime() - (index * 60 * 1000)); // Каждая минута назад
        const isUni = index % 2 === 0;
        return {
          id: 1000 + index,
          time: timeAgo,
          type: 'Фарминг',
          amount: isUni ? 0.00231 : 0.00023,
          currency: isUni ? 'UNI' : 'TON',
          isNew: index < 2 // Отметка новых записей для анимации
        };
      });
      
      setDeposits(mockDeposits);
      setFarmingHistory(mockHistory);
      setIsLoading(false);
      setOpacity(1);
      setTranslateY(0);
    }, 800);
  }, []);
  
  // Эффект для периодического добавления новых начислений
  useEffect(() => {
    // Не добавляем новые записи, если не на вкладке истории начислений или загрузка не завершена
    if (activeTab !== 'allocations' || isLoading) return;
    
    const interval = setInterval(() => {
      setFarmingHistory(prev => {
        const isUni = Math.random() > 0.5;
        const newEntry: FarmingHistory = {
          id: Date.now(),
          time: new Date(),
          type: 'Фарминг',
          amount: isUni ? 0.00231 : 0.00023,
          currency: isUni ? 'UNI' : 'TON',
          isNew: true
        };
        
        // Удаляем пометку "новый" со старых записей через 2 секунды
        setTimeout(() => {
          setFarmingHistory(items => 
            items.map(item => 
              item.id === newEntry.id ? { ...item, isNew: false } : item
            )
          );
        }, 2000);
        
        // Добавляем новую запись в начало и ограничиваем историю 50 записями
        return [newEntry, ...prev].slice(0, 50);
      });
    }, 20000); // Новая запись каждые 20 секунд
    
    return () => clearInterval(interval);
  }, [activeTab, isLoading]);
  
  // Генерируем декоративные частицы для пустого состояния
  const particles = Array(5).fill(0).map((_, i) => ({
    id: i,
    size: Math.random() * 5 + 3, // 3-8px
    top: Math.random() * 70 + 10, // 10-80%
    left: Math.random() * 80 + 10, // 10-90%
    animationDuration: Math.random() * 10 + 10, // 10-20s
    blurAmount: Math.random() * 3 + 1, // 1-4px blur
  }));
  
  // Форматирование даты
  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('ru-RU', options);
  };
  
  // Форматирование времени
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    });
  };
  
  // Получение информации о пакете по ID
  const getPackageInfo = (packageId: number) => {
    return BOOST_PACKAGES.find(pkg => pkg.id === packageId) || null;
  };
  
  // Генерация строки типа пакета
  const getPackageTypeString = (deposit: FarmingDeposit): string => {
    const packageInfo = getPackageInfo(deposit.packageId);
    if (!packageInfo) return 'Неизвестный пакет';
    
    return `${packageInfo.type} Boost ${packageInfo.price.includes('TON') ? 
      packageInfo.price.split(' + ')[1] : packageInfo.price} (${deposit.uniYield}/${deposit.tonYield})`;
  };
  
  // Рендер вкладки с активными депозитами
  const renderDepositsTab = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-opacity-50 border-t-primary rounded-full"></div>
        </div>
      );
    }
    
    if (deposits.length === 0) {
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
            <i className="fas fa-box-open text-3xl text-foreground/40"></i>
          </div>
          
          <p className="text-md text-foreground opacity-80 mb-2">
            У вас пока нет активных пакетов
          </p>
          
          <p className="text-sm text-foreground opacity-50 max-w-sm mx-auto">
            Купите Boost или откройте фарминг, чтобы начать
          </p>
          
          <button className="mt-6 gradient-button text-white px-4 py-2 rounded-lg font-medium transition-transform hover:scale-105">
            Начать фарминг
          </button>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {deposits.map((deposit) => (
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
                  <i className={`fas fa-${deposit.isActive ? 'rocket' : 'hourglass-end'} text-sm ${deposit.isActive ? 'text-primary' : 'text-gray-500'} mr-2`}></i>
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
                  <div className="flex items-center">
                    <span className="text-purple-300">+2500</span>
                    <span className="text-gray-400 ml-1.5 text-xs">UNI</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="text-blue-400">+0.02</span>
                    <span className="text-gray-400 ml-1.5 text-xs">TON</span>
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-foreground opacity-70 mb-1">Доход в секунду</p>
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <span className="text-purple-300">+0.00231</span>
                    <span className="text-gray-400 ml-1.5 text-xs">UNI</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="text-blue-400">+0.000023</span>
                    <span className="text-gray-400 ml-1.5 text-xs">TON</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-800">
              <div className="flex items-center">
                <i className="fas fa-gift text-primary/70 mr-2"></i>
                <p className="text-sm">
                  <span className="text-foreground opacity-70">Бонус: </span>
                  <span className="text-accent">{deposit.bonus}</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Рендер вкладки с историей начислений
  const renderHistoryTab = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-opacity-50 border-t-primary rounded-full"></div>
        </div>
      );
    }
    
    if (farmingHistory.length === 0) {
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
            <i className="fas fa-history text-3xl text-foreground/40"></i>
          </div>
          
          <p className="text-md text-foreground opacity-80 mb-2">
            Начислений пока нет
          </p>
          
          <p className="text-sm text-foreground opacity-50 max-w-sm mx-auto">
            Фарминг ещё не активирован
          </p>
        </div>
      );
    }
    
    return (
      <div className="overflow-hidden">
        {/* Эффект затухания вверху и внизу для скролла */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent z-10 pointer-events-none"></div>
        
        <div className="overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
          <table className="w-full">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-gray-800">
                <th className="py-2 text-left text-sm text-foreground opacity-70">Время</th>
                <th className="py-2 text-left text-sm text-foreground opacity-70">Тип</th>
                <th className="py-2 text-right text-sm text-foreground opacity-70">Сумма</th>
                <th className="py-2 text-right text-sm text-foreground opacity-70">Валюта</th>
              </tr>
            </thead>
            <tbody>
              {farmingHistory.map((item) => (
                <tr 
                  key={item.id} 
                  className={`
                    border-b border-gray-800/30 transition-all duration-300
                    ${item.isNew ? 'bg-primary/10 animate-highlightRow' : 'hover:bg-black/20'}
                  `}
                >
                  <td className="py-2 text-sm">{formatTime(item.time)}</td>
                  <td className="py-2 text-sm">
                    <div className="flex items-center">
                      <i className="fas fa-seedling text-xs text-green-400 mr-2"></i>
                      {item.type}
                    </div>
                  </td>
                  <td className="py-2 text-sm text-right">
                    <span className={`${item.currency === 'UNI' ? 'text-purple-300' : 'text-blue-400'}`}>
                      +{item.amount.toFixed(item.amount < 0.001 ? 7 : 5)}
                    </span>
                  </td>
                  <td className="py-2 text-sm text-right text-gray-400">
                    {item.currency}
                    {item.isNew && (
                      <span className="ml-2 inline-block w-2 h-2 bg-primary rounded-full animate-ping"></span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            // Имитация обновления данных
            setIsLoading(true);
            setTimeout(() => setIsLoading(false), 800);
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
              ${activeTab === 'deposits' 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-muted text-foreground/70 hover:bg-muted/70'}
            `}
            onClick={() => setActiveTab('deposits')}
          >
            <i className="fas fa-box-open mr-2"></i>
            Активные депозиты
          </button>
          <button
            className={`
              px-4 py-2 rounded-lg text-sm font-medium
              transition-all duration-300
              ${activeTab === 'allocations' 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-muted text-foreground/70 hover:bg-muted/70'}
            `}
            onClick={() => setActiveTab('allocations')}
          >
            <i className="fas fa-history mr-2"></i>
            Начисления
          </button>
        </div>
        
        {/* Содержимое вкладок */}
        <div className="min-h-[200px] relative">
          {activeTab === 'deposits' ? renderDepositsTab() : renderHistoryTab()}
        </div>
      </div>
    </div>
  );
};

export default FarmingHistoryComponent;
