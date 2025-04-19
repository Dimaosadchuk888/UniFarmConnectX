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
  const { data: farmingInfo, isLoading: isLoadingFarmingInfo } = useQuery<{ success: boolean, data: TonFarmingInfo }>({
    queryKey: [`/api/ton-farming/info?user_id=${userId}`],
    refetchInterval: 10000, // Обновляем каждые 10 секунд
  });
  
  // Анимация статуса активности фарминга
  useEffect(() => {
    const interval = setInterval(() => {
      setDotOpacity(prev => (prev === 0.5 ? 1 : 0.5));
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Анимация значений при обновлении данных
  useEffect(() => {
    if (farmingInfo && farmingInfo.success && farmingInfo.data) {
      const farmingData = farmingInfo.data;
      
      // Установка статуса активности
      setIsActive(farmingData.isActive);
      
      // Анимируем нарастание значений
      const animationDuration = 1000;
      const startTime = Date.now();
      
      // Гарантируем числовые значения или используем 0 по умолчанию
      const targetDaily = parseFloat(farmingData.dailyIncomeTon) || 0;
      const targetPerSecond = parseFloat(farmingData.totalTonRatePerSecond) || 0;
      
      // Логируем значения для отладки (можно убрать в продакшн)
      console.log("[TonFarmingStatusCard] Данные:", {
        dailyIncomeTon: farmingData.dailyIncomeTon,
        totalTonRatePerSecond: farmingData.totalTonRatePerSecond,
        parsedDaily: targetDaily,
        parsedPerSecond: targetPerSecond
      });
      
      // Запускаем импульс при обновлении значений
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 1000);
      
      const animate = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        
        // Эффект замедления к концу
        const easeOutProgress = 1 - Math.pow(1 - progress, 3);
        
        setDailyYield(targetDaily * easeOutProgress);
        setPerSecond(targetPerSecond * easeOutProgress);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
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
              {isActive 
                ? `Активно ${farmingInfo?.data?.depositCount || 0} TON Boost депозитов` 
                : 'Нет активных TON Boost депозитов'}
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
                  {formatNumberWithPrecision(dailyYield, 5)}
                </span>
                <span className="text-blue-400/70 ml-1.5">TON</span>
              </div>
            </div>
            
            <div className="bg-blue-900/20 rounded-lg p-4 flex flex-col justify-between">
              <div className="text-blue-300/80 text-sm mb-1">В секунду</div>
              <div className="flex items-baseline">
                <span className="text-blue-400 text-xl font-medium">
                  {formatNumberWithPrecision(perSecond, 8)}
                </span>
                <span className="text-blue-400/70 ml-1.5">TON</span>
              </div>
            </div>
            
            <div className="bg-blue-900/20 rounded-lg p-4 flex flex-col justify-between">
              <div className="text-blue-300/80 text-sm mb-1">Общая сумма</div>
              <div className="flex items-baseline">
                <span className="text-blue-400 text-xl font-medium">
                  {formatNumberWithPrecision(parseFloat(farmingInfo?.totalTonDepositAmount || "0"), 2)}
                </span>
                <span className="text-blue-400/70 ml-1.5">TON</span>
              </div>
            </div>
            
            <div className="bg-blue-900/20 rounded-lg p-4 flex flex-col justify-between">
              <div className="text-blue-300/80 text-sm mb-1">Активных депозитов</div>
              <div className="flex items-baseline">
                <span className="text-blue-400 text-xl font-medium">
                  {farmingInfo?.depositCount || 0}
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