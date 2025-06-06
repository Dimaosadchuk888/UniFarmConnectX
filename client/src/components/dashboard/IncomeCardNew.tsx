import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { useUser } from '@/contexts/userContext';

// Интерфейсы для данных API
interface UniFarmingInfo {
  isActive: boolean;
  depositAmount?: string;
  ratePerSecond?: string;
  depositCount?: number;
  totalDepositAmount?: string;
  totalRatePerSecond?: string;
  dailyIncomeUni?: string;
  startDate?: string | null;
  uni_farming_start_timestamp?: string | null;
}

interface TonFarmingInfo {
  totalTonRatePerSecond: string;
  totalUniRatePerSecond: string;
  dailyIncomeTon: string;
  dailyIncomeUni: string;
  deposits: Array<{
    id: number;
    user_id: number;
    ton_amount: string | number;
    uni_amount?: string | number;
    start_date: string;
    end_date?: string;
    status: string;
    created_at: string;
  }>;
}

const IncomeCardNew: React.FC = () => {
  const { userId } = useUser();
  const validUserId = userId || '1';
  
  // Анимация нарастающего счетчика
  const [displayedHourRate, setDisplayedHourRate] = useState(0);
  const [displayedDayRate, setDisplayedDayRate] = useState(0);
  const [displayedTonHourRate, setDisplayedTonHourRate] = useState(0);
  const [displayedTonDayRate, setDisplayedTonDayRate] = useState(0);
  
  // Состояния для хранения целевых значений из API
  const [targetHourRate, setTargetHourRate] = useState(0);
  const [targetDayRate, setTargetDayRate] = useState(0);
  const [targetTonHourRate, setTargetTonHourRate] = useState(0);
  const [targetTonDayRate, setTargetTonDayRate] = useState(0);
  
  // Получаем данные фарминга
  const { data: uniFarmingInfo } = useQuery({
    queryKey: ['/api/v2/uni-farming/status', validUserId],
    queryFn: () => correctApiRequest(`/api/v2/uni-farming/status?user_id=${validUserId}`),
    refetchInterval: 5000,
  });

  const { data: tonFarmingInfo } = useQuery({
    queryKey: ['/api/v2/ton-boosts/active', validUserId],
    queryFn: () => correctApiRequest(`/api/v2/ton-boosts/active?user_id=${validUserId}`),
    refetchInterval: 5000,
  });

  const uniFarming: UniFarmingInfo = uniFarmingInfo?.data || {};
  const tonFarming: TonFarmingInfo = tonFarmingInfo?.data || { totalTonRatePerSecond: '0', totalUniRatePerSecond: '0', dailyIncomeTon: '0', dailyIncomeUni: '0', deposits: [] };

  // Вычисляем часовые доходы
  useEffect(() => {
    const uniHourlyRate = parseFloat(uniFarming.ratePerSecond || '0') * 3600;
    const uniDailyRate = parseFloat(uniFarming.dailyIncomeUni || '0');
    const tonHourlyRate = parseFloat(tonFarming.totalTonRatePerSecond || '0') * 3600;
    const tonDailyRate = parseFloat(tonFarming.dailyIncomeTon || '0');

    setTargetHourRate(uniHourlyRate);
    setTargetDayRate(uniDailyRate);
    setTargetTonHourRate(tonHourlyRate);
    setTargetTonDayRate(tonDailyRate);
  }, [uniFarming, tonFarming]);

  // Анимация счетчиков
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const stepTime = duration / steps;

    const animateValue = (target: number, setter: (value: number) => void) => {
      let current = 0;
      const increment = target / steps;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setter(target);
          clearInterval(timer);
        } else {
          setter(current);
        }
      }, stepTime);
      
      return timer;
    };

    const timers = [
      animateValue(targetHourRate, setDisplayedHourRate),
      animateValue(targetDayRate, setDisplayedDayRate),
      animateValue(targetTonHourRate, setDisplayedTonHourRate),
      animateValue(targetTonDayRate, setDisplayedTonDayRate)
    ];

    return () => timers.forEach(clearInterval);
  }, [targetHourRate, targetDayRate, targetTonHourRate, targetTonDayRate]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(6);
  };

  const totalHourly = displayedHourRate + displayedTonHourRate;
  const totalDaily = displayedDayRate + displayedTonDayRate;

  return (
    <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Доходы от фарминга</h3>
        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
      </div>
      
      <div className="space-y-4">
        {/* Общий доход */}
        <div className="bg-black/20 rounded-lg p-4">
          <div className="text-sm text-gray-300 mb-1">Общий доход</div>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xl font-bold text-white">
                {formatNumber(totalHourly)} UNI/час
              </div>
              <div className="text-sm text-gray-400">
                {formatNumber(totalDaily)} UNI/день
              </div>
            </div>
          </div>
        </div>

        {/* UNI Farming */}
        {uniFarming.isActive && (
          <div className="bg-black/20 rounded-lg p-4">
            <div className="text-sm text-blue-300 mb-1">UNI Farming</div>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-lg font-semibold text-white">
                  {formatNumber(displayedHourRate)} UNI/час
                </div>
                <div className="text-xs text-gray-400">
                  {formatNumber(displayedDayRate)} UNI/день
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TON Boost Farming */}
        {tonFarming.deposits && tonFarming.deposits.length > 0 && (
          <div className="bg-black/20 rounded-lg p-4">
            <div className="text-sm text-purple-300 mb-1">TON Boost</div>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-lg font-semibold text-white">
                  {formatNumber(displayedTonHourRate)} TON/час
                </div>
                <div className="text-xs text-gray-400">
                  {formatNumber(displayedTonDayRate)} TON/день
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomeCardNew;