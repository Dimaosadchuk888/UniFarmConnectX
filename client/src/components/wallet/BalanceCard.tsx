import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

interface WalletBalanceResponse {
  success: boolean;
  data: {
    balance_uni: string;
    balance_ton: string;
    uni_farming_active: boolean;
    uni_deposit_amount: string;
    uni_farming_balance: string;
  };
}

interface FarmingResponse {
  success: boolean;
  data: {
    isActive: boolean;
    depositAmount: string;
    farmingBalance: string;
    ratePerSecond: string;
    startDate: string | null;
  };
}

const BalanceCard: React.FC = () => {
  // Состояния для текущих балансов
  const [uniBalance, setUniBalance] = useState<number>(0);
  const [tonBalance, setTonBalance] = useState<number>(0);
  
  // Состояния для визуальных эффектов
  const [uniAnimating, setUniAnimating] = useState<boolean>(false);
  const [tonAnimating, setTonAnimating] = useState<boolean>(false);
  
  // Состояния для текущего прироста (получаем из API)
  const [uniRate, setUniRate] = useState<number>(0);
  const [tonRate, setTonRate] = useState<number>(0);
  
  // Предыдущие значения для анимации
  const [prevTonBalance, setPrevTonBalance] = useState<number>(tonBalance);
  const [prevUniBalance, setPrevUniBalance] = useState<number>(uniBalance);
  
  // Для отладки - хранение сырых данных и времени запроса
  const [lastFetchTime, setLastFetchTime] = useState<string>('');
  const [rawUniBalance, setRawUniBalance] = useState<string>('');
  
  // Получаем баланс из API
  const { data, isLoading, refetch } = useQuery<WalletBalanceResponse>({
    queryKey: ['/api/wallet/balance?user_id=1'],
    staleTime: 0, // Отключаем кеширование для получения свежих данных каждый раз
  });
  
  // Функция для обновления баланса UNI с анимацией
  const updateUniBalanceWithAnimation = useCallback((newValue: number) => {
    // Сохраняем предыдущее значение для эффекта анимации
    if (uniBalance > 0) {
      setPrevUniBalance(uniBalance);
    }
    
    // Устанавливаем анимацию, если значение изменилось
    if (newValue !== uniBalance) {
      setUniAnimating(true);
      setTimeout(() => setUniAnimating(false), 800);
    }
    
    // Обновляем значение
    setUniBalance(newValue);
  }, [uniBalance]);
  
  // Дополнительный запрос для получения данных о фарминге
  const { data: farmingData, refetch: refetchFarming } = useQuery<FarmingResponse>({
    queryKey: ['/api/uni-farming/info?user_id=1'],
    staleTime: 60000, // 1 минута
  });

  // Отслеживаем предыдущее значение баланса для проверки изменений
  const prevRawUniBalanceRef = useRef<string>('');
  
  // Обновляем баланс из API при загрузке данных
  useEffect(() => {
    if (data?.success && data.data) {
      // Сохраняем время запроса для отладки
      const now = new Date();
      const formattedTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
      setLastFetchTime(formattedTime);
      
      // Сохраняем сырое значение баланса для отладки
      const newRawUniBalance = data.data.balance_uni;
      setRawUniBalance(newRawUniBalance);
      
      // Логируем обновление баланса в консоль
      console.log("UNI Balance Updated:", newRawUniBalance);
      
      // Проверяем, изменился ли баланс с последнего запроса
      const apiUniBalance = parseFloat(newRawUniBalance);
      if (!isNaN(apiUniBalance)) {
        // Активируем анимацию только если значение изменилось
        if (newRawUniBalance !== prevRawUniBalanceRef.current) {
          console.log(`Balance changed: ${prevRawUniBalanceRef.current} -> ${newRawUniBalance} at ${formattedTime}`);
          setUniAnimating(true);
          setTimeout(() => setUniAnimating(false), 800);
        }
        
        // Всегда обновляем отображаемое значение для точности
        setUniBalance(apiUniBalance);
        
        // Сохраняем текущее значение как предыдущее для следующего сравнения
        prevRawUniBalanceRef.current = newRawUniBalance;
      }
      
      const apiTonBalance = parseFloat(data.data.balance_ton);
      if (!isNaN(apiTonBalance)) {
        setTonBalance(apiTonBalance);
      }
    }
  }, [data]);

  // Обновляем скорость фарминга при получении данных
  useEffect(() => {
    if (farmingData?.success && farmingData.data) {
      // Получаем скорость фарминга из API
      const ratePerSecond = parseFloat(farmingData.data.ratePerSecond || '0');
      if (!isNaN(ratePerSecond)) {
        setUniRate(ratePerSecond);
      }
      
      // Скорость TON фарминга (для демонстрации)
      // В реальном приложении получать из API
      setTonRate(0.00008);
    }
  }, [farmingData]);
  
  // Обновляем баланс каждую секунду, запрашивая данные из API
  useEffect(() => {
    const interval = setInterval(() => {
      // Запрашиваем свежий баланс из API вместо локального расчета
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance?user_id=1'] });
      
      // Для TON токена можно оставить локальную анимацию, так как это демонстрация
      setTonBalance(prevBalance => {
        // Сохраняем предыдущее значение для сравнения
        setPrevTonBalance(prevBalance);
        const newBalance = prevBalance + tonRate;
        
        // Активируем анимацию обновления даже для микро-изменений
        if (newBalance > prevBalance) {
          setTonAnimating(true);
          setTimeout(() => setTonAnimating(false), 700);
        }
        
        return newBalance;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [tonRate]);

  // Форматирование чисел для отображения
  const formatNumber = (num: number, decimals: number = 6): string => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };
  
  // Специальное форматирование для TON (до 5 знаков)
  const formatTonNumber = (num: number): string => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 5,
      maximumFractionDigits: 5
    });
  };
  
  // Форматирование скорости начисления доходов
  const formatRateNumber = (rate: number): JSX.Element => {
    if (rate > 0.001) {
      // Для ставок больше 0.001 показываем до 5 знаков
      return (
        <span>
          +{rate.toLocaleString('en-US', {
            minimumFractionDigits: 5,
            maximumFractionDigits: 5
          })}
        </span>
      );
    } else if (rate > 0) {
      // Для очень маленьких ставок показываем до 7 знаков уменьшенным шрифтом
      return (
        <span className="text-[0.7em] text-opacity-80">
          +{rate.toLocaleString('en-US', {
            minimumFractionDigits: 7,
            maximumFractionDigits: 7
          })}
        </span>
      );
    } else {
      // Для нулевых ставок
      return <span>+0.00000</span>;
    }
  };
  
  // Расчет долларового эквивалента
  const getUSDEquivalent = (amount: number, rate: number): string => {
    const usdValue = amount * rate;
    return `≈ $${formatNumber(usdValue, 2)}`;
  };

  return (
    <div className="bg-card rounded-xl p-5 mb-5 shadow-lg overflow-hidden relative">
      {/* Декоративный градиентный фон */}
      <div 
        className="absolute inset-0 opacity-20" 
        style={{
          background: 'radial-gradient(circle at 10% 20%, rgba(162, 89, 255, 0.2) 0%, transparent 70%), radial-gradient(circle at 80% 70%, rgba(92, 120, 255, 0.2) 0%, transparent 70%)'
        }}
      ></div>
      
      {/* Неоновая рамка */}
      <div className="absolute inset-0 rounded-xl border border-primary/30"></div>
      
      <h2 className="text-lg font-semibold text-white mb-4 relative z-10 flex items-center justify-between">
        <div className="flex items-center">
          <i className="fas fa-wallet text-primary mr-2"></i>
          Ваш баланс
        </div>
        <button 
          onClick={() => {
            // Обновляем оба запроса
            refetch();
            refetchFarming();
            
            // Анимируем обновление UNI
            setUniAnimating(true);
            setTimeout(() => setUniAnimating(false), 800);
          }}
          className="text-sm text-gray-400 hover:text-primary transition-colors"
          disabled={isLoading}
          title="Обновить баланс"
        >
          <i className={`fas fa-sync-alt ${isLoading ? 'animate-spin' : ''}`}></i>
        </button>
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* UNI Token */}
        <div className="bg-black/20 rounded-lg p-4 backdrop-blur-sm relative overflow-hidden">
          {/* Декоративный слой */}
          <div className="absolute inset-0 opacity-20">
            <div 
              className="w-24 h-24 rounded-full absolute -right-8 -top-8 blur-xl"
              style={{ background: 'linear-gradient(45deg, #A259FF, #5945FA)' }}
            ></div>
          </div>
          
          {/* Заголовок токена */}
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
              <i className="fas fa-coins text-primary"></i>
            </div>
            <div>
              <h3 className="text-md font-medium text-white">UNI Token</h3>
              <p className="text-xs text-gray-400">внутренний токен</p>
            </div>
          </div>
          
          {/* Баланс с анимацией */}
          <div className="mb-2">
            <div className="text-2xl font-bold text-white flex items-center">
              <span className={`transition-all duration-300 ${uniAnimating ? 'text-green-400 scale-105' : ''}`}>
                {formatNumber(uniBalance)}
              </span>
              <span className="text-sm ml-1 text-gray-400">UNI</span>
            </div>
            <div className="text-xs text-gray-400">
              {getUSDEquivalent(uniBalance, 0.01)} {/* Предполагаемый курс UNI */}
            </div>
          </div>
          
          {/* Скорость начисления */}
          <div className="bg-success/10 text-success rounded-md px-2 py-1 mt-3 text-xs inline-flex items-center">
            <i className="fas fa-arrow-trend-up mr-1"></i>
            <span className={uniAnimating ? 'text-green-400 font-bold' : ''}>
              {formatRateNumber(uniRate)}
            </span>
            <span className="text-gray-400 ml-1">UNI / сек</span>
          </div>
          
          {/* Отладочная информация */}
          <div className="mt-2 text-xs text-gray-500/50">
            Last fetch: {lastFetchTime || 'не было'}<br/>
            Raw balance: {rawUniBalance || 'не загружен'}
          </div>
        </div>
        
        {/* TON Token */}
        <div className="bg-black/20 rounded-lg p-4 backdrop-blur-sm relative overflow-hidden">
          {/* Декоративный слой */}
          <div className="absolute inset-0 opacity-20">
            <div 
              className="w-24 h-24 rounded-full absolute -right-8 -top-8 blur-xl"
              style={{ background: 'linear-gradient(45deg, #3C86FF, #63B4FF)' }}
            ></div>
          </div>
          
          {/* Заголовок токена */}
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mr-2">
              <i className="fas fa-diamond text-blue-500"></i>
            </div>
            <div>
              <h3 className="text-md font-medium text-white">TON Token</h3>
              <p className="text-xs text-gray-400">блокчейн TON</p>
            </div>
          </div>
          
          {/* Баланс с расширенной анимацией */}
          <div className="mb-2">
            <div className={`relative ${tonAnimating ? 'before:absolute before:inset-0 before:bg-blue-500/5 before:rounded-md before:animate-pulse' : ''}`}>
              <div className="text-2xl font-bold text-white flex items-center relative z-10">
                <span className={`transition-all duration-500 ${
                  tonAnimating 
                    ? 'text-blue-400 scale-105 animate-tonGlow' 
                    : ''
                }`}>
                  {formatTonNumber(tonBalance)}
                </span>
                <span className="text-sm ml-1 text-gray-400">TON</span>
                
                {/* Индикатор изменения */}
                {tonAnimating && tonBalance > prevTonBalance && (
                  <span className="text-xs ml-2 text-blue-400 animate-fade-up absolute -top-3 right-0">
                    <i className="fas fa-caret-up mr-1"></i>
                    +{formatTonNumber(tonBalance - prevTonBalance)}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400">
                {getUSDEquivalent(tonBalance, 2.57)} {/* Предполагаемый курс TON */}
              </div>
            </div>
            
            {/* Доход TON отображается только если больше 0 */}
            {tonRate > 0 && (
              <div className="bg-blue-500/10 text-blue-500 rounded-md px-2 py-1 mt-3 text-xs inline-flex items-center">
                <i className="fas fa-arrow-trend-up mr-1"></i>
                <span className={tonAnimating ? 'text-blue-400 font-bold' : ''}>
                  {formatRateNumber(tonRate)}
                </span>
                <span className="text-gray-400 ml-1">TON / сек</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceCard;