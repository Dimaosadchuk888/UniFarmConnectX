import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';

// Настраиваем BigNumber для правильного округления
BigNumber.config({
  DECIMAL_PLACES: 10,
  ROUNDING_MODE: BigNumber.ROUND_DOWN
});

// Типы данных для фарминга
interface FarmingInfo {
  isActive: boolean;
  depositAmount: string;
  farmingBalance: string;
  ratePerSecond: string;
  startDate: string | null;
}

const UniFarmingCard: React.FC = () => {
  // Состояния для отображения текущего баланса и дохода
  const [currentFarmingBalance, setCurrentFarmingBalance] = useState<string>('0');
  const [ratePerSecond, setRatePerSecond] = useState<string>('0');
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<string>('0');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [animateBalance, setAnimateBalance] = useState<boolean>(false);
  
  // Запрос к API для получения информации о фарминге
  const { data: farmingInfo, isLoading } = useQuery<FarmingInfo>({
    queryKey: ['uniFarmingInfo'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/uni-farming/info?user_id=1');
        if (!response.ok) {
          throw new Error('Ошибка при получении данных фарминга');
        }
        const result = await response.json();
        return result.data as FarmingInfo;
      } catch (error) {
        console.error('Ошибка при получении данных фарминга:', error);
        throw error;
      }
    },
    refetchInterval: 30000, // Обновляем каждые 30 секунд
    staleTime: 10000,
    refetchOnWindowFocus: false
  });
  
  // Устанавливаем начальные значения из ответа API
  useEffect(() => {
    if (farmingInfo) {
      setDepositAmount(farmingInfo.depositAmount);
      setCurrentFarmingBalance(farmingInfo.farmingBalance);
      setRatePerSecond(farmingInfo.ratePerSecond);
      setIsActive(farmingInfo.isActive);
    }
  }, [farmingInfo]);
  
  // Обновляем баланс каждую секунду если фарминг активен
  useEffect(() => {
    if (!isActive || !ratePerSecond) return;
    
    const interval = setInterval(() => {
      setCurrentFarmingBalance(prev => {
        const currentBalance = new BigNumber(prev);
        const rate = new BigNumber(ratePerSecond);
        const newBalance = currentBalance.plus(rate);
        
        // Активируем анимацию баланса
        setAnimateBalance(true);
        setTimeout(() => setAnimateBalance(false), 300);
        
        return newBalance.toString();
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isActive, ratePerSecond]);
  
  // Форматирование чисел для отображения
  const formatNumber = (value: string, decimals: number = 6): string => {
    try {
      const num = new BigNumber(value);
      if (num.isZero()) return '0';
      
      // Если число очень маленькое (меньше 0.001), показываем до 7 знаков
      if (num.isLessThan(0.001)) {
        return num.toFormat(7);
      }
      
      // Иначе показываем до указанного количества знаков
      return num.toFormat(decimals);
    } catch (error) {
      console.error('Ошибка форматирования числа:', error);
      return '0';
    }
  };
  
  // Время с момента старта фарминга
  const getTimeSinceStart = (): string => {
    if (!farmingInfo?.startDate) return 'Нет данных';
    
    const start = new Date(farmingInfo.startDate);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} д. ${diffHours} ч.`;
    } else {
      return `${diffHours} ч.`;
    }
  };
  
  // Скелетон для загрузки
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-4 shadow-lg relative overflow-hidden animate-pulse">
        <div className="h-5 bg-muted rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-muted rounded w-2/3 mb-3"></div>
        <div className="h-4 bg-muted rounded w-1/2 mb-5"></div>
        <div className="h-10 bg-muted rounded w-full"></div>
      </div>
    );
  }
  
  return (
    <div 
      className="bg-card rounded-xl p-4 shadow-lg relative overflow-hidden card-hover-effect"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Фоновые декоративные элементы */}
      <div className="absolute -right-16 -top-16 w-36 h-36 bg-primary/5 rounded-full blur-xl"></div>
      <div className="absolute -left-10 -bottom-10 w-28 h-28 bg-primary/5 rounded-full blur-xl"></div>
      
      <div className="mb-3 flex justify-between items-center">
        <h2 className="text-md font-medium">Основной UNI фарминг</h2>
        <div 
          className={`
            py-1 px-2 text-xs rounded-full 
            ${isActive 
              ? 'bg-green-500/20 text-green-500' 
              : 'bg-gray-500/20 text-gray-400'
            }
          `}
        >
          {isActive ? 'Активен' : 'Не активен'}
        </div>
      </div>
      
      {isActive ? (
        <>
          <div className="mb-2">
            <div className="flex items-baseline">
              <span 
                className={`
                  text-2xl font-semibold
                  ${animateBalance ? 'text-accent' : 'text-foreground'}
                  transition-colors duration-300
                `}
              >
                {formatNumber(currentFarmingBalance)}
              </span>
              <span className="text-sm ml-1.5 text-foreground opacity-70">UNI</span>
            </div>
            <p className="text-xs text-foreground opacity-60">Накопленный доход</p>
          </div>
          
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="flex flex-col bg-muted/30 px-3 py-2 rounded-lg">
              <span className="text-xs text-foreground opacity-60 mb-1">Скорость</span>
              <div className="flex items-baseline">
                <span className="text-sm font-medium text-primary">
                  +{formatNumber(ratePerSecond, 7)}
                </span>
                <span className="text-xs ml-1 text-foreground opacity-70">UNI/сек</span>
              </div>
            </div>
            
            <div className="flex flex-col bg-muted/30 px-3 py-2 rounded-lg">
              <span className="text-xs text-foreground opacity-60 mb-1">Депозит</span>
              <div className="flex items-baseline">
                <span className="text-sm font-medium">
                  {formatNumber(depositAmount, 2)}
                </span>
                <span className="text-xs ml-1 text-foreground opacity-70">UNI</span>
              </div>
            </div>
            
            <div className="flex flex-col bg-muted/30 px-3 py-2 rounded-lg">
              <span className="text-xs text-foreground opacity-60 mb-1">Активен</span>
              <span className="text-sm font-medium">
                {getTimeSinceStart()}
              </span>
            </div>
          </div>
          
          <button 
            className={`
              w-full py-3 rounded-lg font-medium text-white relative overflow-hidden
              ${isHovered ? 'shadow-lg transform translate-y-[-2px]' : 'shadow'}
              transition-all duration-300
            `}
            style={{
              background: isHovered 
                ? 'linear-gradient(90deg, #A259FF 0%, #B368F7 100%)' 
                : 'linear-gradient(45deg, #A259FF 0%, #B368F7 100%)'
            }}
          >
            {/* Эффект блеска при наведении */}
            {isHovered && (
              <div 
                className="absolute inset-0 w-full h-full" 
                style={{
                  background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)',
                  transform: 'translateX(-100%)',
                  animation: 'shimmer 1.5s infinite'
                }}
              ></div>
            )}
            
            <span className="relative z-10">Вывести накопленное</span>
          </button>
        </>
      ) : (
        <>
          <div className="mb-4 text-center py-6">
            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-seedling text-foreground/40 text-2xl"></i>
            </div>
            <p className="text-sm text-foreground opacity-70 mb-1">
              Фарминг не активирован
            </p>
            <p className="text-xs text-foreground opacity-50 max-w-sm mx-auto">
              Отправьте UNI в фарминг, чтобы начать получать пассивный доход
            </p>
          </div>
          
          <button 
            className={`
              w-full py-3 rounded-lg font-medium text-white relative overflow-hidden
              ${isHovered ? 'shadow-lg transform translate-y-[-2px]' : 'shadow'}
              transition-all duration-300
            `}
            style={{
              background: isHovered 
                ? 'linear-gradient(90deg, #A259FF 0%, #B368F7 100%)' 
                : 'linear-gradient(45deg, #A259FF 0%, #B368F7 100%)'
            }}
          >
            {/* Эффект блеска при наведении */}
            {isHovered && (
              <div 
                className="absolute inset-0 w-full h-full" 
                style={{
                  background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)',
                  transform: 'translateX(-100%)',
                  animation: 'shimmer 1.5s infinite'
                }}
              ></div>
            )}
            
            <span className="relative z-10">Активировать фарминг</span>
          </button>
        </>
      )}
    </div>
  );
};

export default UniFarmingCard;