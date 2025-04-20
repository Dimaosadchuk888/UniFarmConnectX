import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import BigNumber from 'bignumber.js';

interface UniFarmingCardProps {
  userData: any;
}

interface FarmingInfo {
  isActive: boolean;
  depositAmount: string;
  ratePerSecond: string;
  depositCount?: number;
  totalDepositAmount?: string;
  startDate?: string | null;
  uni_farming_start_timestamp?: string | null;
}

const UniFarmingCard: React.FC<UniFarmingCardProps> = ({ userData }) => {
  const queryClient = useQueryClient();
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Получаем информацию о фарминге
  const { data: farmingResponse, isLoading } = useQuery({
    queryKey: ['/api/uni-farming/info?user_id=1'], // Добавляем user_id в запрос
    refetchInterval: 10000, // Обновляем данные каждые 10 секунд чтобы видеть текущий баланс
  });
  
  // Извлекаем данные фарминга из ответа API
  const farmingData = (farmingResponse as any)?.data || { 
    isActive: false, 
    depositAmount: '0', 
    ratePerSecond: '0',
    depositCount: 0,
    totalDepositAmount: '0',
    startDate: null,
    uni_farming_start_timestamp: null 
  };
  
  const farmingInfo: FarmingInfo = farmingData;
  
  // Мутация для создания фарминг-депозита
  const depositMutation = useMutation({
    mutationFn: async (amount: string) => {
      const res = await apiRequest('POST', '/api/uni-farming/deposit', { user_id: 1, amount });
      return res.json();
    },
    onSuccess: () => {
      // Сбрасываем форму и обновляем данные
      setDepositAmount('');
      setError(null);
      // Инвалидируем запросы для обновления данных
      queryClient.invalidateQueries({ queryKey: ['/api/uni-farming/info'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/1'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    },
    onError: (error: Error) => {
      setError(error.message || 'Произошла ошибка при создании депозита');
    },
  });
  
  // Информационная мутация (просто для показа информации о новом механизме)
  const infoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/uni-farming/harvest', { user_id: 1 });
      return res.json();
    },
    onSuccess: (data) => {
      // Показываем информацию о новом механизме
      setError(data.message || 'Доход автоматически начисляется на ваш баланс UNI');
      
      // Обновляем данные
      queryClient.invalidateQueries({ queryKey: ['/api/uni-farming/info'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
    },
    onError: (error: Error) => {
      setError('Ошибка при обновлении данных');
    },
  });
  
  // Обработчик отправки формы
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Валидация
    if (!depositAmount || depositAmount === '0') {
      setError('Пожалуйста, введите сумму депозита');
      return;
    }
    
    try {
      const amount = new BigNumber(depositAmount);
      if (amount.isNaN() || amount.isLessThanOrEqualTo(0)) {
        setError('Сумма должна быть положительным числом');
        return;
      }
      
      // Проверяем, достаточно ли средств
      const balance = new BigNumber(userData?.balance_uni || '0');
      if (amount.isGreaterThan(balance)) {
        setError('Недостаточно средств на балансе');
        return;
      }
      
      // Отправляем запрос
      depositMutation.mutate(amount.toString());
    } catch (err) {
      setError('Некорректный формат суммы');
    }
  };
  
  // Обработчик для показа информации о новом механизме автоматического начисления
  const handleShowInfo = () => {
    infoMutation.mutate();
  };
  
  // Форматирование числа с учетом малых значений
  const formatNumber = (value: string, decimals: number = 3): string => {
    try {
      const num = new BigNumber(value || '0');
      
      // Для очень маленьких значений используем научную нотацию
      if (num.isGreaterThan(0) && num.isLessThanOrEqualTo(0.001)) {
        return num.toExponential(2);
      }
      
      return num.toFixed(decimals);
    } catch (err) {
      return '0';
    }
  };
  
  // Проверяем, активен ли фарминг
  const isActive = farmingInfo.isActive;
  
  // Расчет дневного дохода (для отображения)
  const calculateDailyIncome = (): string => {
    if (!isActive || !farmingInfo.totalDepositAmount) return '0';
    try {
      // Доходность составляет 0.5% в день от общего депозита
      const totalDepositAmount = new BigNumber(farmingInfo.totalDepositAmount);
      return totalDepositAmount.multipliedBy(0.005).toFixed(3); // 3 знака после запятой для дневного дохода
    } catch (err) {
      return '0';
    }
  };
  
  // Расчет дохода в секунду (для отображения)
  const calculateSecondRate = (): string => {
    if (!isActive || !farmingInfo.totalDepositAmount) return '0';
    try {
      // Доходность составляет 0.5% в день от общего депозита, делим на количество секунд в сутках
      const totalDepositAmount = new BigNumber(farmingInfo.totalDepositAmount);
      const dailyIncome = totalDepositAmount.multipliedBy(0.005);
      const secondsInDay = 86400;
      return dailyIncome.dividedBy(secondsInDay).toFixed(8); // 8 знаков для секундного дохода
    } catch (err) {
      return '0';
    }
  };
  
  // Форматирование даты начала фарминга
  const formatStartDate = (): string => {
    if (!isActive) return '-';
    
    const timestamp = farmingInfo.uni_farming_start_timestamp || farmingInfo.startDate;
    if (!timestamp) return '-';
    
    try {
      return new Date(timestamp).toLocaleDateString('ru-RU');
    } catch (err) {
      return '-';
    }
  };
  
  return (
    <div className="bg-card rounded-xl p-4 mb-5 shadow-md transition-all duration-300 hover:shadow-lg">
      <h2 className="text-xl font-semibold mb-3 purple-gradient-text">Основной UNI пакет</h2>
      
      {/* Информация о текущем фарминге (отображается всегда, если активен) */}
      {isActive && (
        <div className="mb-5">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-foreground opacity-70">Текущий депозит</p>
              <p className="text-lg font-medium">{formatNumber(farmingInfo.totalDepositAmount)} UNI</p>
            </div>
            <div>
              <p className="text-sm text-foreground opacity-70">Дата активации</p>
              <p className="text-md font-medium">
                {formatStartDate()}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-foreground opacity-70">Активных депозитов UNI</p>
              <p className="text-md font-medium">{farmingInfo.depositCount || 0} шт.</p>
            </div>
            <div>
              <p className="text-sm text-foreground opacity-70">Процент доходности</p>
              <p className="text-md font-medium">
                <span className="text-primary">0.5%</span> в сутки
              </p>
            </div>
          </div>
          
          <div className="mb-3">
            <p className="text-sm text-foreground opacity-70">Скорость начисления</p>
            <p className="text-md font-medium">
              <span className="text-primary">+{formatNumber(calculateSecondRate(), 8)}</span> UNI/сек
              <span className="text-foreground opacity-70 ml-2">
                (≈ +{formatNumber(calculateDailyIncome())} UNI в день)
              </span>
            </p>
          </div>
          
          <div className="p-3 bg-indigo-900/30 border border-indigo-500/30 rounded-lg flex items-center">
            <div className="text-indigo-300 mr-2">
              <i className="fas fa-info-circle"></i>
            </div>
            <div>
              <p className="text-sm text-indigo-300 font-medium">
                Доход автоматически начисляется на ваш баланс
              </p>
              <p className="text-xs text-indigo-200/70 mt-1">
                Каждую секунду ваш баланс UNI увеличивается на сумму дохода от фарминга
              </p>
            </div>
          </div>
          

        </div>
      )}
      
      {/* Форма для создания депозита (отображается всегда) */}
      <div className={isActive ? "mt-6 pt-4 border-t border-slate-700" : ""}>
        {isActive && (
          <h3 className="text-md font-medium mb-4">Пополнить фарминг</h3>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-foreground opacity-70 mb-1">
              Введите сумму UNI
            </label>
            <input
              type="text"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full p-2 border border-input rounded-lg bg-card"
              placeholder="0.00"
            />
            <p className="text-sm text-foreground opacity-70 mt-1">
              Доступно: {formatNumber(userData?.balance_uni || '0')} UNI
            </p>
          </div>
          
          {error && (
            <div className="mb-4 p-2 bg-red-900/30 border border-red-500 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <p className="text-sm text-foreground opacity-70">Минимальный депозит</p>
            <p className="text-md font-medium">
              <span className="text-primary">5</span> UNI
            </p>
          </div>
          
          <button 
            type="submit"
            disabled={depositMutation.isPending || isLoading || infoMutation.isPending}
            className={`w-full py-2 px-4 rounded-lg font-medium ${
              depositMutation.isPending || isLoading || infoMutation.isPending
                ? 'bg-muted text-foreground opacity-50'
                : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700'
            } transition-all duration-300`}
          >
            {depositMutation.isPending ? 'Обработка...' : isActive ? 'Пополнить' : 'Активировать фарминг'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UniFarmingCard;