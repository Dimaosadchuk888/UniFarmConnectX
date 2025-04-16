import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import BigNumber from 'bignumber.js';

interface UniFarmingCardProps {
  userData: any;
}

const UniFarmingCard: React.FC<UniFarmingCardProps> = ({ userData }) => {
  const queryClient = useQueryClient();
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [localFarmingBalance, setLocalFarmingBalance] = useState<string>('0');
  
  // Получаем информацию о фарминге
  const { data: farmingResponse, isLoading } = useQuery({
    queryKey: ['/api/uni-farming/info?user_id=1'], // Добавляем user_id в запрос
    refetchInterval: 30000, // Обновляем данные каждые 30 секунд
  });
  
  // Извлекаем данные фарминга из ответа API
  const farmingData = farmingResponse?.data || { isActive: false, depositAmount: '0', farmingBalance: '0', ratePerSecond: '0' };
  const farmingInfo = farmingData;
  
  // Мутация для создания фарминг-депозита
  const depositMutation = useMutation({
    mutationFn: async (amount: string) => {
      const res = await apiRequest('POST', '/api/uni-farming/deposit', { amount });
      return res.json();
    },
    onSuccess: () => {
      // Сбрасываем форму и обновляем данные
      setDepositAmount('');
      setError(null);
      // Инвалидируем запросы для обновления данных
      queryClient.invalidateQueries({ queryKey: ['/api/uni-farming/info'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/1'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    },
    onError: (error: Error) => {
      setError(error.message || 'Произошла ошибка при создании депозита');
    },
  });
  
  // Мутация для сбора накопленного баланса
  const harvestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/uni-farming/harvest', {});
      return res.json();
    },
    onSuccess: () => {
      // Обновляем данные
      queryClient.invalidateQueries({ queryKey: ['/api/uni-farming/info'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/1'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    },
    onError: (error: Error) => {
      setError(error.message || 'Произошла ошибка при сборе средств');
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
  
  // Обработчик сбора средств
  const handleHarvest = () => {
    harvestMutation.mutate();
  };
  
  // Эффект для обновления локального баланса каждую секунду
  useEffect(() => {
    if (!farmingInfo.isActive) {
      setLocalFarmingBalance('0');
      return;
    }
    
    // Устанавливаем начальное значение из API
    setLocalFarmingBalance(farmingInfo.farmingBalance);
    
    // Создаем интервал для обновления баланса каждую секунду
    const intervalId = setInterval(() => {
      setLocalFarmingBalance(prevBalance => {
        if (!farmingInfo.ratePerSecond) return prevBalance;
        
        try {
          const currentBalance = new BigNumber(prevBalance);
          const ratePerSecond = new BigNumber(farmingInfo.ratePerSecond);
          return currentBalance.plus(ratePerSecond).toString();
        } catch (err) {
          return prevBalance;
        }
      });
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [farmingInfo]);
  
  // Форматирование числа с учетом малых значений
  const formatNumber = (value: string, decimals: number = 3): string => {
    try {
      const num = new BigNumber(value);
      
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
  
  return (
    <div className="bg-card rounded-xl p-4 mb-5 shadow-md transition-all duration-300 hover:shadow-lg">
      <h2 className="text-xl font-semibold mb-3 purple-gradient-text">Основной UNI пакет</h2>
      
      {/* Активный фарминг */}
      {isActive ? (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-foreground opacity-70">Сумма депозита</p>
              <p className="text-lg font-medium">{formatNumber(farmingInfo?.data?.depositAmount || '0')} UNI</p>
            </div>
            <div>
              <p className="text-sm text-foreground opacity-70">Накоплено</p>
              <p className="text-lg font-medium purple-gradient-text">{formatNumber(localFarmingBalance)} UNI</p>
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-foreground opacity-70">Скорость</p>
            <p className="text-md font-medium">
              <span className="text-primary">+{formatNumber(farmingInfo?.data?.ratePerSecond || '0', 5)}</span> UNI/сек
              <span className="text-foreground opacity-70 ml-2">
                (0.5% в день)
              </span>
            </p>
          </div>
          
          <button 
            onClick={handleHarvest}
            disabled={harvestMutation.isPending || new BigNumber(localFarmingBalance).isLessThanOrEqualTo(0)}
            className={`w-full py-2 px-4 rounded-lg font-medium ${
              harvestMutation.isPending || new BigNumber(localFarmingBalance).isLessThanOrEqualTo(0)
                ? 'bg-muted text-foreground opacity-50'
                : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700'
            } transition-all duration-300`}
          >
            {harvestMutation.isPending ? 'Обработка...' : 'Собрать доход'}
          </button>
        </div>
      ) : (
        /* Форма для создания депозита */
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
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <p className="text-sm text-foreground opacity-70">Доходность</p>
            <p className="text-md font-medium">
              <span className="text-primary">0.5%</span> в день
            </p>
          </div>
          
          <button 
            type="submit"
            disabled={depositMutation.isPending || isLoading}
            className={`w-full py-2 px-4 rounded-lg font-medium ${
              depositMutation.isPending || isLoading
                ? 'bg-muted text-foreground opacity-50'
                : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700'
            } transition-all duration-300`}
          >
            {depositMutation.isPending ? 'Обработка...' : 'Фармить'}
          </button>
        </form>
      )}
    </div>
  );
};

export default UniFarmingCard;