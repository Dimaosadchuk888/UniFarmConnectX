import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { formatNumberWithPrecision, getUserIdFromURL } from '@/lib/utils';

interface TonFarmingInfo {
  isActive: boolean;
  totalTonDepositAmount: string;
  depositCount: number;
  totalTonRatePerSecond: string;
  totalUniRatePerSecond: string;
  dailyIncomeTon: string;
  dailyIncomeUni: string;
  deposits: any[];
}

const TonFarmingStatusCard: React.FC = () => {
  // Получаем ID пользователя
  const userId = getUserIdFromURL() || '1';
  
  // Анимация числовых значений
  const [dailyYield, setDailyYield] = useState(0);
  const [perSecond, setPerSecond] = useState(0);
  
  // Пульсирующий эффект
  const [isPulsing, setIsPulsing] = useState(false);
  
  // Индикатор активности фарминга
  const [isActive, setIsActive] = useState(false);
  const [dotOpacity, setDotOpacity] = useState(0.5);
  
  // Получаем информацию о TON фарминге
  const apiUrl = `/api/ton-farming/info?user_id=${userId}`;
  
  const { data: farmingInfo, isLoading: isLoadingFarmingInfo } = useQuery<{ success: boolean, data: TonFarmingInfo }>({
    queryKey: [apiUrl],
    refetchInterval: 5000, // Обновляем каждые 5 секунд
  });
  
  // Анимация статуса активности фарминга
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    try {
      interval = setInterval(() => {
        try {
          setDotOpacity(prev => (prev === 0.5 ? 1 : 0.5));
        } catch (error) {
          console.error('Ошибка при изменении прозрачности индикатора:', error);
          // В случае ошибки пытаемся восстановить состояние
          setDotOpacity(0.5);
        }
      }, 1000);
    } catch (error) {
      console.error('Ошибка при создании интервала анимации статуса:', error);
    }
    
    return () => {
      try {
        if (interval) clearInterval(interval);
      } catch (error) {
        console.error('Ошибка при очистке интервала анимации статуса:', error);
      }
    };
  }, []);
  
  // Анимация значений при обновлении данных
  useEffect(() => {
    try {
      if (farmingInfo && farmingInfo.success && farmingInfo.data) {
        try {
          const farmingData = farmingInfo.data;
          
          // Установка статуса активности
          setIsActive(farmingData.isActive);
          
          // Преобразуем строковые значения непосредственно в числа
          // Используем строгое приведение типов с обработкой научной нотации
          let targetDaily = 0;
          let targetPerSecond = 0;
          
          try {
            targetDaily = typeof farmingData.dailyIncomeTon === 'string' ? 
              parseFloat(farmingData.dailyIncomeTon) : 
              (farmingData.dailyIncomeTon || 0);
              
            // Проверка на валидное число
            if (isNaN(targetDaily)) targetDaily = 0;
            
            targetPerSecond = typeof farmingData.totalTonRatePerSecond === 'string' ? 
              parseFloat(farmingData.totalTonRatePerSecond) : 
              (farmingData.totalTonRatePerSecond || 0);
              
            // Проверка на валидное число
            if (isNaN(targetPerSecond)) targetPerSecond = 0;
          } catch (parseError) {
            console.error('Ошибка при парсинге числовых значений:', parseError);
            targetDaily = 0;
            targetPerSecond = 0;
          }
          
          try {
            // Запускаем импульс при обновлении значений
            setIsPulsing(true);
            setTimeout(() => {
              try {
                setIsPulsing(false);
              } catch (error) {
                console.error('Ошибка при сбросе состояния пульсации:', error);
              }
            }, 1000);
          } catch (pulseError) {
            console.error('Ошибка при установке состояния пульсации:', pulseError);
          }
          
          // Анимируем нарастание значений
          const animationDuration = 1000;
          const startTime = Date.now();
          
          const animate = () => {
            try {
              const currentTime = Date.now();
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / animationDuration, 1);
              
              // Эффект замедления к концу
              const easeOutProgress = 1 - Math.pow(1 - progress, 3);
              
              try {
                // В последний шаг анимации (progress === 1) устанавливаем точные значения
                // чтобы избежать ошибок округления при анимации
                if (progress === 1) {
                  setDailyYield(targetDaily);
                  setPerSecond(targetPerSecond);
                } else {
                  setDailyYield(targetDaily * easeOutProgress);
                  setPerSecond(targetPerSecond * easeOutProgress);
                }
                
                if (progress < 1) {
                  requestAnimationFrame(animate);
                }
              } catch (stateError) {
                console.error('Ошибка при обновлении состояния анимации:', stateError);
                // При ошибке устанавливаем конечные значения напрямую
                setDailyYield(targetDaily);
                setPerSecond(targetPerSecond);
              }
            } catch (animateError) {
              console.error('Ошибка в функции анимации:', animateError);
              // При ошибке устанавливаем конечные значения напрямую
              setDailyYield(targetDaily);
              setPerSecond(targetPerSecond);
            }
          };
          
          try {
            animate();
          } catch (startAnimateError) {
            console.error('Ошибка при запуске анимации:', startAnimateError);
            // При ошибке устанавливаем конечные значения напрямую
            setDailyYield(targetDaily);
            setPerSecond(targetPerSecond);
          }
        } catch (dataProcessingError) {
          console.error('Ошибка при обработке данных фарминга:', dataProcessingError);
          // Устанавливаем безопасные значения по умолчанию
          setIsActive(false);
          setDailyYield(0);
          setPerSecond(0);
        }
      }
    } catch (mainError) {
      console.error('Ошибка в эффекте обновления данных фарминга:', mainError);
      // Устанавливаем безопасные значения по умолчанию
      setIsActive(false);
      setDailyYield(0);
      setPerSecond(0);
    }
  }, [farmingInfo]);

  return (
    <Card className={`w-full shadow-md mb-6 overflow-hidden transition-all duration-300 ${
      isActive ? 'border-blue-600/50 bg-gradient-to-br from-blue-950/40 to-blue-900/10' : 'border-gray-800/30 bg-card'
    }`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl text-blue-400">
              TON Фарминг
              {isActive && (
                <span className="relative ml-2 inline-flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-50`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 bg-blue-500`} style={{ opacity: dotOpacity }}></span>
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-blue-300/70">
              {(() => {
                try {
                  if (!isActive) {
                    return 'Нет активных TON Boost депозитов';
                  }
                  
                  // Безопасный доступ к depositCount с проверкой
                  const depositCount = farmingInfo?.data?.depositCount;
                  
                  // Проверяем что depositCount число или может быть преобразовано в число
                  let count = 0;
                  
                  if (depositCount !== undefined && depositCount !== null) {
                    if (typeof depositCount === 'number') {
                      count = isNaN(depositCount) ? 0 : depositCount;
                    } else if (typeof depositCount === 'string') {
                      const parsed = parseInt(depositCount, 10);
                      count = isNaN(parsed) ? 0 : parsed;
                    }
                  }
                  
                  return `Активно ${count} TON Boost депозитов`;
                } catch (error) {
                  console.error('Ошибка при формировании описания:', error);
                  return isActive 
                    ? 'Активны TON Boost депозиты' 
                    : 'Нет активных TON Boost депозитов';
                }
              })()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoadingFarmingInfo ? (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
          </div>
        ) : !isActive ? (
          <div className="text-center py-4 text-foreground opacity-70">
            <p>Купите TON Boost-пакеты для начала фарминга</p>
          </div>
        ) : (
          <div className={`
            grid grid-cols-2 gap-4 mt-1
            ${isPulsing ? 'animate-pulse' : ''}
          `}>
            <div className="bg-blue-900/20 rounded-lg p-4 flex flex-col justify-between">
              <div className="text-blue-300/80 text-sm mb-1">Доход в сутки</div>
              <div className="flex items-baseline">
                <span className="text-blue-400 text-xl font-medium">
                  {(() => {
                    try {
                      // Проверка на валидное число
                      return formatNumberWithPrecision(isNaN(dailyYield) ? 0 : dailyYield, 5);
                    } catch (error) {
                      console.error('Ошибка при форматировании дневного дохода:', error);
                      return '0.00000';
                    }
                  })()}
                </span>
                <span className="text-blue-400/70 ml-1.5">TON</span>
              </div>
            </div>
            
            <div className="bg-blue-900/20 rounded-lg p-4 flex flex-col justify-between">
              <div className="text-blue-300/80 text-sm mb-1">В секунду</div>
              <div className="flex items-baseline">
                <span className="text-blue-400 text-xl font-medium">
                  {(() => {
                    try {
                      // Проверка на валидное число
                      return formatNumberWithPrecision(isNaN(perSecond) ? 0 : perSecond, 8);
                    } catch (error) {
                      console.error('Ошибка при форматировании значения в секунду:', error);
                      return '0.00000000';
                    }
                  })()}
                </span>
                <span className="text-blue-400/70 ml-1.5">TON</span>
              </div>
            </div>
            
            <div className="bg-blue-900/20 rounded-lg p-4 flex flex-col justify-between">
              <div className="text-blue-300/80 text-sm mb-1">Общая сумма</div>
              <div className="flex items-baseline">
                <span className="text-blue-400 text-xl font-medium">
                  {(() => {
                    try {
                      const rawAmount = farmingInfo?.data?.totalTonDepositAmount || "0";
                      const amount = typeof rawAmount === 'string' ? parseFloat(rawAmount) : (rawAmount || 0);
                      // Проверка на валидное число
                      return formatNumberWithPrecision(isNaN(amount) ? 0 : amount, 2);
                    } catch (error) {
                      console.error('Ошибка при форматировании общей суммы:', error);
                      return '0.00';
                    }
                  })()}
                </span>
                <span className="text-blue-400/70 ml-1.5">TON</span>
              </div>
            </div>
            
            <div className="bg-blue-900/20 rounded-lg p-4 flex flex-col justify-between">
              <div className="text-blue-300/80 text-sm mb-1">Активных депозитов</div>
              <div className="flex items-baseline">
                <span className="text-blue-400 text-xl font-medium">
                  {(() => {
                    try {
                      // Безопасный доступ к depositCount с проверкой
                      const depositCount = farmingInfo?.data?.depositCount;
                      
                      // Проверяем что depositCount число или может быть преобразовано в число
                      if (depositCount === undefined || depositCount === null) {
                        return 0;
                      }
                      
                      if (typeof depositCount === 'number') {
                        return isNaN(depositCount) ? 0 : depositCount;
                      }
                      
                      // Если это строка, пробуем преобразовать
                      if (typeof depositCount === 'string') {
                        const parsed = parseInt(depositCount, 10);
                        return isNaN(parsed) ? 0 : parsed;
                      }
                      
                      // Если другой тип данных, возвращаем 0
                      return 0;
                    } catch (error) {
                      console.error('Ошибка при форматировании количества депозитов:', error);
                      return 0;
                    }
                  })()}
                </span>
                <span className="text-blue-400/70 ml-1.5">шт.</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TonFarmingStatusCard;