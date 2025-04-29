import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { correctApiRequest } from '@/lib/correctApiRequest';
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
  const { data: farmingResponse, isLoading } = useQuery<{ success: boolean; data: FarmingInfo }>({
    queryKey: ['/api/uni-farming/info?user_id=1'], // Добавляем user_id в запрос
    refetchInterval: 10000, // Обновляем данные каждые 10 секунд чтобы видеть текущий баланс
  });
  
  // Информация о фарминге из ответа API
  const farmingInfo: FarmingInfo = (farmingResponse && farmingResponse.data) ? farmingResponse.data : {
    isActive: false,
    depositAmount: '0',
    ratePerSecond: '0',
    depositCount: 0,
    totalDepositAmount: '0',
  };
  
  // Информационная мутация (просто для показа информации о новом механизме)
  const infoMutation = useMutation({
    mutationFn: async () => {
      try {
        // Строго числовой user_id - 1 как число, не строка
        const requestBody = { 
          user_id: 1 
        };
        
        console.log('➡️ Отправляем инфо-запрос с телом:', JSON.stringify(requestBody));
        
        // Используем относительный URL вместо абсолютного для предотвращения ошибок в разных окружениях
        const endpoint = '/api/uni-farming/harvest';
        
        console.log(`➡️ Относительный URL для POST инфо-запроса: ${endpoint}`);
        
        // Получаем абсолютный URL с учетом текущего хоста
        const protocol = window.location.protocol;
        const host = window.location.host;
        const fullUrl = `${protocol}//${host}${endpoint}`;
        
        // Выполняем прямой fetch запрос с правильными заголовками
        console.log(`➡️ Выполняем fetch к ${fullUrl}`);
        
        const response = await fetch(fullUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }).then(res => res.json());
        
        console.log(`⬅️ Получен ответ инфо-запроса:`, response);
        
        if (response?.success) {
          console.log(`✅ Ответ инфо-запроса успешен:`, response);
          return response;
        } else {
          console.log(`⚠️ Ответ инфо-запроса не содержит success:true`, response);
          // Возвращаем простой объект с сообщением
          return {
            success: true,
            message: 'Доход от фарминга автоматически начисляется на ваш баланс UNI каждую секунду!'
          };
        }
      } catch (error) {
        console.error('❌ Ошибка в информационном запросе:', error);
        // Возвращаем сообщение по умолчанию вместо генерации ошибки
        return {
          success: false,
          message: 'Произошла ошибка при выполнении запроса, но доход всё равно продолжает начисляться автоматически.'
        };
      }
    },
    onSuccess: (data) => {
      // Показываем информацию о новом механизме
      setError(data.message || 'Доход автоматически начисляется на ваш баланс UNI');
      
      // Обновляем данные
      queryClient.invalidateQueries({ queryKey: ['/api/uni-farming/info'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
    },
    onError: (error: Error) => {
      setError('Ошибка при обновлении данных: ' + error.message);
    },
  });
  
  // Обработчик отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
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
      
      // Напрямую выполняем запрос без использования mutation
      try {
        // Создаем тело запроса с правильными типами данных
        const requestBody = {
          amount: amount.toString(),  // Передаем amount как строку, как в тестовом скрипте
          user_id: 1  // ID пользователя как число
        };
        
        console.log('📤 Отправка запроса на создание депозита:', JSON.stringify(requestBody));
        
        // Используем относительный URL вместо абсолютного для предотвращения ошибок в разных окружениях
        const endpoint = '/api/uni-farming/deposit';
        
        console.log(`📤 [ОТЛАДКА ДЕПОЗИТА] POST запрос на относительный URL: ${endpoint}`);
        console.log(`📤 [ОТЛАДКА ДЕПОЗИТА] Тело запроса (объект):`, requestBody);
        console.log(`📤 [ОТЛАДКА ДЕПОЗИТА] amount тип:`, typeof requestBody.amount);
        console.log(`📤 [ОТЛАДКА ДЕПОЗИТА] user_id тип:`, typeof requestBody.user_id);
        
        // Преобразуем number в string если amount число
        if (typeof requestBody.amount === 'number') {
          console.log(`📤 [ОТЛАДКА ДЕПОЗИТА] amount конвертирован из числа в строку`);
          requestBody.amount = String(requestBody.amount);
        }
        
        // Устанавливаем статус загрузки вручную
        setError('Обработка запроса...');
        
        // Получаем абсолютный URL с учетом текущего хоста
        const protocol = window.location.protocol;
        const host = window.location.host;
        const fullUrl = `${protocol}//${host}${endpoint}`;
        
        // JSON.stringify для тела запроса
        const requestBodyJSON = JSON.stringify(requestBody);
        
        // Выполняем прямой fetch запрос с правильными заголовками
        console.log(`📤 [ОТЛАДКА ДЕПОЗИТА] Выполняем fetch к ${fullUrl}`);
        console.log(`📤 [ОТЛАДКА ДЕПОЗИТА] Тело запроса в формате JSON: ${requestBodyJSON}`);
        console.log(`📤 [ОТЛАДКА ДЕПОЗИТА] Длина JSON: ${requestBodyJSON.length} символов`);
        
        try {
          console.log(`📤 [ОТЛАДКА ДЕПОЗИТА] Используем новую утилиту correctApiRequest`);
          
          // Используем нашу новую утилиту для отправки запроса
          const response = await correctApiRequest(
            endpoint,   // URL-путь
            'POST',     // метод
            requestBody // данные
          );
          
          console.log(`📥 Ответ получен:`, response);
        
          if (!response.success) {
            console.error('❌ Ошибка в ответе API:', response);
            throw new Error(`Ошибка сервера: ${response.error || 'Неизвестная ошибка'}`);
          }
          
          // Обрабатываем успешный ответ
          console.log('📥 Ответ успешно получен в формате JSON:', response);
          
          // Обрабатываем успешный ответ
          setDepositAmount('');
          setError(null);
          
          // Инвалидируем запросы для обновления данных
          queryClient.invalidateQueries({ queryKey: ['/api/uni-farming/info'] });
          queryClient.invalidateQueries({ queryKey: ['/api/users/1'] });
          queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
          queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        } catch (fetchError: any) {
          console.error('⚠️ Ошибка при выполнении запроса:', fetchError);
          setError(`Не удалось выполнить депозит: ${fetchError.message}`);
        }
      } catch (err) {
        console.error('⚠️ Ошибка при подготовке запроса:', err);
        setError(`Ошибка при подготовке запроса: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
      }
    } catch (err) {
      console.error('⚠️ Ошибка валидации формы:', err);
      setError('Некорректный формат суммы');
    }
  };
  
  // Обработчик для показа информации о новом механизме автоматического начисления
  const handleShowInfo = () => {
    try {
      console.log('Запускаем infoMutation...');
      infoMutation.mutate();
    } catch (error) {
      console.error('Ошибка при запуске infoMutation:', error);
      // Установим сообщение даже в случае ошибки
      setError('Доход от фарминга автоматически начисляется на ваш баланс UNI каждую секунду!');
    }
  };
  
  // Форматирование числа с учетом малых значений
  const formatNumber = (value: string | undefined, decimals: number = 3): string => {
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
              <p className="text-lg font-medium">{formatNumber(farmingInfo.totalDepositAmount || '0')} UNI</p>
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
            disabled={isLoading || error === 'Обработка запроса...'}
            className={`w-full py-2 px-4 rounded-lg font-medium ${
              isLoading || error === 'Обработка запроса...'
                ? 'bg-muted text-foreground opacity-50'
                : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700'
            } transition-all duration-300`}
          >
            {error === 'Обработка запроса...' ? 'Обработка...' : isActive ? 'Пополнить' : 'Активировать фарминг'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UniFarmingCard;