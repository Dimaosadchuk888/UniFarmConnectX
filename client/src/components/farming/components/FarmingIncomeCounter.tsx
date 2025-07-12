import React, { useState, useEffect, useMemo } from 'react';
import BigNumber from 'bignumber.js';

interface FarmingIncomeCounterProps {
  depositAmount: string | number;
  rate: number; // Дневная ставка (0.01 = 1% в день)
  lastUpdate: string | null;
  isActive: boolean;
}

const FarmingIncomeCounter: React.FC<FarmingIncomeCounterProps> = ({
  depositAmount,
  rate,
  lastUpdate,
  isActive
}) => {
  const [accumulatedIncome, setAccumulatedIncome] = useState<string>('0');
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Конвертируем входные данные в BigNumber для точных расчетов
  const deposit = useMemo(() => {
    try {
      return new BigNumber(depositAmount || 0);
    } catch {
      return new BigNumber(0);
    }
  }, [depositAmount]);

  const dailyRate = useMemo(() => {
    try {
      return new BigNumber(rate || 0);
    } catch {
      return new BigNumber(0);
    }
  }, [rate]);

  // Обновляем текущее время каждую секунду
  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive]);

  // Расчет накопленного дохода
  useEffect(() => {
    if (!isActive || !lastUpdate || deposit.isZero() || dailyRate.isZero()) {
      setAccumulatedIncome('0');
      return;
    }

    try {
      const lastUpdateTime = new Date(lastUpdate).getTime();
      const now = currentTime;
      
      // Защита от некорректных дат
      if (isNaN(lastUpdateTime) || lastUpdateTime > now) {
        setAccumulatedIncome('0');
        return;
      }

      // Расчет времени в днях с момента последнего обновления
      const millisecondsElapsed = now - lastUpdateTime;
      const daysElapsed = millisecondsElapsed / (1000 * 60 * 60 * 24);

      // Формула: income = depositAmount * rate * daysElapsed
      const income = deposit
        .multipliedBy(dailyRate)
        .multipliedBy(daysElapsed);

      // Форматируем до 6 знаков после запятой для точности
      setAccumulatedIncome(income.toFixed(6));
    } catch (error) {
      console.error('[FarmingIncomeCounter] Ошибка расчета:', error);
      setAccumulatedIncome('0');
    }
  }, [currentTime, deposit, dailyRate, lastUpdate, isActive]);

  // Форматирование числа для отображения
  const formatIncome = (value: string): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    
    // Если число очень маленькое, показываем больше знаков
    if (num < 0.01 && num > 0) {
      return num.toFixed(6);
    }
    // Для обычных чисел показываем 2 знака
    return num.toFixed(2);
  };

  // Расчет дохода в секунду для отображения скорости
  const incomePerSecond = useMemo(() => {
    if (deposit.isZero() || dailyRate.isZero()) return '0';
    
    // Доход в секунду = (депозит * ставка) / (24 * 60 * 60)
    const secondlyIncome = deposit
      .multipliedBy(dailyRate)
      .dividedBy(86400);
    
    return secondlyIncome.toFixed(8);
  }, [deposit, dailyRate]);

  if (!isActive) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Накопленный доход:
        </span>
        <div className="text-right">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            +{formatIncome(accumulatedIncome)} UNI
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            ~{formatIncome(incomePerSecond)} UNI/сек
          </div>
        </div>
      </div>
      
      {/* Визуальный индикатор активности */}
      <div className="flex items-center gap-2 mt-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Доход накапливается в реальном времени
        </span>
      </div>
      
      {/* Информационная подсказка */}
      <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-gray-600 dark:text-gray-400">
        💡 Начисление на баланс происходит автоматически каждые 5 минут
      </div>
    </div>
  );
};

export default FarmingIncomeCounter;