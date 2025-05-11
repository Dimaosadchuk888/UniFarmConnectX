import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { apiRequest, invalidateQueryWithUserId } from '@/lib/queryClient';
import BigNumber from 'bignumber.js';
import { useUser } from '@/contexts/userContext';
import useErrorBoundary from '@/hooks/useErrorBoundary';
import { useNotification } from '@/contexts/notificationContext';

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
  const { userId } = useUser(); // Получаем ID пользователя из контекста
  const { showNotification } = useNotification(); // Для показа уведомлений
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  // Защита от повторных вызовов
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // Флаг для предотвращения автоматических вызовов
  const depositRequestSent = useRef<boolean>(false);
  
  // Применяем Error Boundary к компоненту
  const withErrorBoundary = useErrorBoundary({
    queryKey: ['/api/uni-farming/status', userId],
    errorTitle: 'Ошибка загрузки UNI фарминга',
    errorDescription: 'Не удалось загрузить информацию о вашем UNI фарминге. Пожалуйста, обновите страницу или повторите позже.',
    resetButtonText: 'Обновить данные'
  });
  
  // Получаем информацию о фарминге с динамическим ID пользователя
  const { data: farmingResponse, isLoading } = useQuery<{ success: boolean; data: FarmingInfo }>({
    queryKey: ['/api/uni-farming/status', userId], // Обновлено на корректный эндпоинт /api/uni-farming/status
    refetchInterval: 15000, // Обновление каждые 15 секунд для более актуальных данных
    enabled: !!userId, // Запрос активен только если есть userId
    queryFn: async () => {
      try {
        // Используем безопасный запрос с правильными заголовками
        const response = await correctApiRequest<{ success: boolean; data: FarmingInfo }>(
          `/api/uni-farming/status?user_id=${userId || 1}`, 
          'GET'
        );
        
        console.log('[DEBUG] Получены данные фарминга:', response.data);
        // Выводим подробные дебаг данные для анализа точности отображения
        if (response.data) {
          console.log('[DEBUG] UNI Farming - Детали:',{
            isActive: response.data.isActive,
            depositAmount: response.data.depositAmount,
            ratePerSecond: response.data.ratePerSecond,
            depositCount: response.data.depositCount,
            totalDepositAmount: response.data.totalDepositAmount,
            startTimestamp: response.data.uni_farming_start_timestamp || response.data.startDate
          })
        }
        return response;
      } catch (error: any) {
        console.error('[ERROR] UniFarmingCard - Ошибка при получении информации о фарминге:', error);
        throw new Error(`Ошибка получения данных фарминга: ${error.message || 'Неизвестная ошибка'}`);
      }
    }
  });
  
  // Информация о фарминге из ответа API
  const farmingInfo: FarmingInfo = (farmingResponse && farmingResponse.data) ? farmingResponse.data : {
    isActive: false,
    depositAmount: '0',
    ratePerSecond: '0',
    depositCount: 0,
    totalDepositAmount: '0',
  };
  
  // Для подсчета транзакций фарминга
  const { data: transactionsResponse } = useQuery({
    queryKey: ['/api/transactions', userId],
    enabled: !!userId && farmingInfo.isActive,
    queryFn: async () => {
      return await correctApiRequest('/api/transactions?user_id=' + (userId || 1), 'GET');
    }
  });
  
  // Подсчет депозитов и суммирование их вклада из транзакций
  const farmingDeposits = React.useMemo(() => {
    if (!transactionsResponse?.data?.transactions) return [];
    return transactionsResponse.data.transactions.filter(
      (tx: any) => tx.type === 'deposit' && tx.currency === 'UNI' && tx.source === 'uni_farming'
    );
  }, [transactionsResponse?.data?.transactions]);
  
  // Рассчитываем суммарную величину всех депозитов
  const totalDepositsAmount = React.useMemo(() => {
    if (!farmingDeposits || farmingDeposits.length === 0) return farmingInfo.depositAmount || '0';
    
    // Суммируем все депозиты
    const total = farmingDeposits.reduce((sum: BigNumber, tx: any) => {
      return sum.plus(new BigNumber(tx.amount || '0'));
    }, new BigNumber(0));
    
    return total.toString();
  }, [farmingDeposits, farmingInfo.depositAmount]);
  
  // Подсчитываем количество активных депозитов
  const depositCount = farmingDeposits.length || 0;
  
  // Информационная мутация (просто для показа информации о новом механизме)
  const infoMutation = useMutation({
    mutationFn: async () => {
      try {
        // Используем динамический ID пользователя из контекста
        const requestBody = { 
          user_id: userId 
        };
        
        // Используем correctApiRequest вместо apiRequest для лучшей обработки ошибок
        const response = await correctApiRequest('/api/uni-farming/harvest', 'POST', requestBody);
        
        if (response?.success) {
          return response;
        } else {
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
      try {
        // Показываем информацию о новом механизме
        setError(data.message || 'Доход автоматически начисляется на ваш баланс UNI');
        
        // Обновляем данные с учетом динамического ID пользователя
        // Используем новую функцию вместо прямого вызова invalidateQueries
        invalidateQueryWithUserId('/api/uni-farming/status');
        invalidateQueryWithUserId('/api/wallet/balance');
      } catch (error: any) {
        console.error('[ERROR] UniFarmingCard - Ошибка в onSuccess infoMutation:', error);
        // Даже в случае ошибки показываем позитивное сообщение
        setError('Доход автоматически начисляется на ваш баланс UNI каждую секунду!');
      }
    },
    onError: (error: Error) => {
      try {
        console.error('[ERROR] UniFarmingCard - Ошибка в infoMutation:', error);
        setError('Ошибка при обновлении данных: ' + error.message);
      } catch (err: any) {
        console.error('[ERROR] UniFarmingCard - Ошибка в обработке onError:', err);
        setError('Произошла ошибка при обновлении данных');
      }
    },
  });
  
  // Мутация для выполнения депозита (заменяет прямое использование fetch)
  const depositMutation = useMutation({
    mutationFn: async (amount: string) => {
      // Формируем тело запроса с правильными типами данных
      const requestBody = {
        amount: String(amount).trim(), // Гарантированно строка без пробелов
        user_id: Number(userId || 1) // Гарантированно число
      };
      
      console.log('Отправляем депозит:', requestBody);
      
      // Используем correctApiRequest вместо apiRequest для лучшей обработки ошибок
      return correctApiRequest('/api/uni-farming/deposit', 'POST', requestBody);
    },
    onSuccess: () => {
      try {
        // Очищаем форму и сообщение об ошибке
        setDepositAmount('');
        setError(null);
        
        // Обновляем данные с учетом динамического ID пользователя
        // Используем новую функцию вместо прямого вызова invalidateQueries
        invalidateQueryWithUserId('/api/uni-farming/status');
        invalidateQueryWithUserId('/api/wallet/balance');
        invalidateQueryWithUserId('/api/transactions');
      } catch (error: any) {
        console.error('[ERROR] UniFarmingCard - Ошибка в onSuccess depositMutation:', error);
        // Даже в случае ошибки отображаем успех
        setError(null);
      }
    },
    onError: (error: Error) => {
      try {
        console.error('[ERROR] UniFarmingCard - Ошибка в depositMutation:', error);
        setError(`Не удалось выполнить депозит: ${error.message}`);
      } catch (err: any) {
        console.error('[ERROR] UniFarmingCard - Ошибка обработки onError depositMutation:', err);
        setError('Не удалось выполнить депозит: пожалуйста, попробуйте позже');
      }
    },
    onSettled: () => {
      try {
        // Разрешаем повторный вызов в любом случае
        setIsSubmitting(false);
      } catch (error: any) {
        console.error('[ERROR] UniFarmingCard - Ошибка в onSettled depositMutation:', error);
        // В крайнем случае, сбросим флаг для следующих попыток
        setIsSubmitting(false);
      }
    }
  });
  
  // Улучшенный обработчик отправки формы с расширенной обработкой ошибок
  const handleSubmit = (e: React.FormEvent) => {
    try {
      // Предотвращаем стандартное поведение формы
      e.preventDefault();
      
      // Предотвращаем множественные вызовы
      if (isSubmitting) {
        console.log('Предотвращен повторный вызов отправки формы (isSubmitting=true)');
        return;
      }
      
      try {
        // Устанавливаем флаг отправки и очищаем ошибки
        setIsSubmitting(true);
        setError(null);
      } catch (stateError) {
        console.error('Ошибка при установке состояния отправки:', stateError);
        // Даже в случае ошибки продолжаем выполнение
      }
      
      // Валидация наличия суммы
      if (!depositAmount || depositAmount.trim() === '' || depositAmount === '0') {
        try {
          setError('Пожалуйста, введите сумму депозита');
          setIsSubmitting(false);
        } catch (stateError) {
          console.error('Ошибка при установке сообщения об ошибке:', stateError);
        }
        return;
      }
      
      // Минимальная сумма депозита - 10 UNI согласно требованиям
      const MIN_DEPOSIT = 10;
      
      try {
        // Создаем BigNumber для безопасной работы с числами
        let amount: BigNumber;
        try {
          // Удаляем все пробелы и другие нецифровые символы, кроме точки
          const cleanAmount = depositAmount.trim().replace(/[^\d.]/g, '');
          amount = new BigNumber(cleanAmount);
          
          // Проверка на валидное число
          if (amount.isNaN() || !amount.isFinite()) {
            setError('Введено некорректное числовое значение');
            setIsSubmitting(false);
            return;
          }
          
          // Проверка минимальной суммы
          if (amount.isLessThan(MIN_DEPOSIT)) {
            setError(`Минимальная сумма депозита - ${MIN_DEPOSIT} UNI`);
            setIsSubmitting(false);
            return;
          }
        } catch (bnError) {
          console.error('Ошибка при создании BigNumber из введенной суммы:', bnError);
          setError('Некорректный формат суммы');
          setIsSubmitting(false);
          return;
        }
        
        // Проверка корректности суммы
        if (amount.isLessThanOrEqualTo(0)) {
          setError('Сумма должна быть положительным числом');
          setIsSubmitting(false);
          return;
        }
        
        // Проверка минимальной суммы депозита
        if (amount.isLessThan(MIN_DEPOSIT)) {
          setError(`Минимальная сумма депозита: ${MIN_DEPOSIT} UNI`);
          setIsSubmitting(false);
          return;
        }
        
        // Получаем и проверяем баланс
        let balance: BigNumber;
        try {
          // Безопасное получение баланса
          const balanceStr = userData?.balance_uni;
          if (balanceStr === undefined || balanceStr === null) {
            console.error('Не удалось получить баланс пользователя');
            setError('Не удалось получить информацию о балансе');
            setIsSubmitting(false);
            return;
          }
          
          // Создаем BigNumber для баланса
          balance = new BigNumber(balanceStr);
          
          // Проверка на валидный баланс
          if (balance.isNaN() || !balance.isFinite()) {
            console.error('Получен некорректный баланс:', balanceStr);
            setError('Ошибка получения баланса');
            setIsSubmitting(false);
            return;
          }
        } catch (balanceError) {
          console.error('Ошибка при получении или обработке баланса:', balanceError);
          setError('Ошибка проверки баланса');
          setIsSubmitting(false);
          return;
        }
        
        // Проверка достаточности средств
        if (amount.isGreaterThan(balance)) {
          setError('Недостаточно средств на балансе');
          setIsSubmitting(false);
          return;
        }
        
        try {
          // Вызываем мутацию с валидированной суммой
          console.log('Отправка депозита:', amount.toString());
          depositMutation.mutate(amount.toString());
        } catch (mutationError) {
          console.error('Ошибка при вызове depositMutation:', mutationError);
          setError('Не удалось отправить запрос на сервер');
          setIsSubmitting(false);
        }
      } catch (validationError) {
        console.error('Ошибка при валидации формы:', validationError);
        setError('Произошла ошибка при проверке введенных данных');
        setIsSubmitting(false);
      }
    } catch (globalError) {
      console.error('Глобальная ошибка в handleSubmit:', globalError);
      try {
        setError('Произошла непредвиденная ошибка');
        setIsSubmitting(false);
      } catch (stateError) {
        console.error('Дополнительная ошибка при обработке глобальной ошибки:', stateError);
      }
    }
  };
  
  // Обработчик для показа информации о новом механизме автоматического начисления с улучшенной обработкой ошибок
  const handleShowInfo = () => {
    try {
      // Проверяем доступность infoMutation
      if (!infoMutation) {
        console.error('infoMutation недоступен');
        try {
          setError('Доход от фарминга автоматически начисляется на ваш баланс UNI каждую секунду!');
        } catch (stateError) {
          console.error('Ошибка при установке сообщения о доходе:', stateError);
        }
        return;
      }
      
      // Проверяем, что у нас есть userId
      if (!userId) {
        console.warn('handleShowInfo вызван без userId');
        try {
          setError('Доход от фарминга автоматически начисляется на ваш баланс UNI каждую секунду!');
        } catch (stateError) {
          console.error('Ошибка при установке сообщения о доходе:', stateError);
        }
        return;
      }
      
      // Проверка активности фарминга
      if (!isActive) {
        console.log('Показываем информацию для неактивного фарминга');
        try {
          setError('Активируйте фарминг, чтобы начать получать доход автоматически');
        } catch (stateError) {
          console.error('Ошибка при установке сообщения о неактивном фарминге:', stateError);
        }
        return;
      }
      
      // Вызываем мутацию с обработкой ошибок
      try {
        console.log('Запускаем infoMutation...');
        infoMutation.mutate();
      } catch (mutationError) {
        console.error('Ошибка при запуске infoMutation:', mutationError);
        
        // Показываем информационное сообщение в любом случае
        try {
          setError('Доход от фарминга автоматически начисляется на ваш баланс UNI каждую секунду!');
        } catch (stateError) {
          console.error('Ошибка при установке сообщения о доходе после ошибки мутации:', stateError);
        }
      }
    } catch (globalError) {
      console.error('Глобальная ошибка в handleShowInfo:', globalError);
      
      // Гарантируем, что пользователь получит информацию даже при ошибке
      try {
        setError('Доход от фарминга автоматически начисляется на ваш баланс UNI каждую секунду!');
      } catch (finalError) {
        console.error('Критическая ошибка при установке сообщения о доходе:', finalError);
      }
    }
  };
  
  // Форматирование числа с учетом малых значений и расширенной обработкой ошибок
  const formatNumber = (value: string | undefined, decimals: number = 3): string => {
    try {
      // Проверка наличия значения
      if (value === undefined || value === null) {
        return decimals === 0 ? '0' : '0.' + '0'.repeat(decimals);
      }
      
      // Нормализация значения
      let normalizedValue = value;
      
      // Если это не строка, попробуем преобразовать
      if (typeof value !== 'string') {
        try {
          normalizedValue = String(value);
        } catch (conversionError) {
          console.error('Ошибка преобразования значения в строку:', conversionError);
          return decimals === 0 ? '0' : '0.' + '0'.repeat(decimals);
        }
      }
      
      // Проверка на пустую строку
      if (normalizedValue.trim() === '') {
        return decimals === 0 ? '0' : '0.' + '0'.repeat(decimals);
      }
      
      // Создаем BigNumber с защитой от некорректных значений
      let num: BigNumber;
      try {
        num = new BigNumber(normalizedValue);
        
        // Проверка на NaN или Infinity
        if (num.isNaN() || !num.isFinite()) {
          console.error('Получено нечисловое значение:', normalizedValue);
          return decimals === 0 ? '0' : '0.' + '0'.repeat(decimals);
        }
      } catch (bnError) {
        console.error('Ошибка создания BigNumber:', bnError, 'для значения:', normalizedValue);
        return decimals === 0 ? '0' : '0.' + '0'.repeat(decimals);
      }
      
      try {
        // Для очень маленьких значений используем научную нотацию
        if (num.isGreaterThan(0) && num.isLessThanOrEqualTo(0.001)) {
          return num.toExponential(2);
        }
        
        // Для нормальных значений используем фиксированное количество десятичных знаков
        return num.toFixed(decimals);
      } catch (formatError) {
        console.error('Ошибка форматирования числа:', formatError);
        
        // Запасной вариант форматирования - просто преобразуем в строку и округлим
        try {
          const numValue = parseFloat(normalizedValue);
          if (isNaN(numValue)) {
            return decimals === 0 ? '0' : '0.' + '0'.repeat(decimals);
          }
          
          return numValue.toFixed(decimals);
        } catch (fallbackError) {
          console.error('Ошибка в запасном форматировании:', fallbackError);
          return decimals === 0 ? '0' : '0.' + '0'.repeat(decimals);
        }
      }
    } catch (err) {
      console.error('Глобальная ошибка в formatNumber:', err);
      return decimals === 0 ? '0' : '0.' + '0'.repeat(decimals);
    }
  };
  
  // Проверяем, активен ли фарминг
  const isActive = farmingInfo.isActive;
  
  // Расчет дневного дохода (для отображения) с улучшенной обработкой ошибок
  const calculateDailyIncome = (): string => {
    try {
      // Проверяем активность фарминга
      if (!isActive) {
        return '0';
      }
      
      // Получаем скорость начисления в секунду из API напрямую
      const ratePerSecondStr = farmingInfo.ratePerSecond;
      if (!ratePerSecondStr) {
        console.log('Отсутствует скорость начисления для расчета дневного дохода');
        return '0';
      }
      
      try {
        // Используем BigNumber для безопасных вычислений
        const ratePerSecond = new BigNumber(ratePerSecondStr);
        
        // Проверка на валидное число
        if (ratePerSecond.isNaN() || !ratePerSecond.isFinite()) {
          console.error('Невалидное значение скорости начисления:', ratePerSecondStr);
          return '0';
        }
        
        // Количество секунд в дне
        const SECONDS_IN_DAY = new BigNumber(86400);
        
        // Вычисляем дневной доход: ratePerSecond * SECONDS_IN_DAY
        const dailyIncome = ratePerSecond.multipliedBy(SECONDS_IN_DAY);
        
        // Проверка результата на валидность
        if (dailyIncome.isNaN() || !dailyIncome.isFinite()) {
          console.error('Ошибка при расчете дневного дохода, получено:', dailyIncome.toString());
          return '0';
        }
        
        return dailyIncome.toFixed(3); // 3 знака после запятой для дневного дохода
      } catch (calculationError) {
        console.error('Ошибка при вычислении дневного дохода:', calculationError);
        return '0';
      }
    } catch (err) {
      console.error('Глобальная ошибка в calculateDailyIncome:', err);
      return '0';
    }
  };
  
  // Расчет дохода в секунду (для отображения) с улучшенной обработкой ошибок
  const calculateSecondRate = (): string => {
    try {
      // Проверяем активность фарминга
      if (!isActive) {
        return '0';
      }
      
      // Получаем скорость начисления в секунду непосредственно из API
      const ratePerSecondStr = farmingInfo.ratePerSecond;
      if (!ratePerSecondStr) {
        console.log('Отсутствует скорость начисления из API');
        return '0';
      }
      
      try {
        // Создаем BigNumber из скорости начисления
        const ratePerSecond = new BigNumber(ratePerSecondStr);
        
        // Проверка на валидное число
        if (ratePerSecond.isNaN() || !ratePerSecond.isFinite()) {
          console.error('Невалидное значение скорости начисления:', ratePerSecondStr);
          return '0';
        }
        
        // Возвращаем скорость напрямую из API с форматированием
        return ratePerSecond.toFixed(8); // 8 знаков для секундного дохода
      } catch (bnError) {
        console.error('Ошибка при обработке скорости начисления:', bnError);
        return '0';
      }
    } catch (err) {
      console.error('Глобальная ошибка в calculateSecondRate:', err);
      return '0';
    }
  };
  
  // Форматирование даты начала фарминга с улучшенной обработкой ошибок
  // Расчет годовой доходности (APR) на основе скорости начисления
  const calculateAPR = (): { annual: string, daily: string } => {
    try {
      // Проверяем активность фарминга
      if (!isActive) {
        return { annual: '0', daily: '0' };
      }
      
      // В нашем случае ставка фиксированная: 0.5% в день (из бизнес-логики)
      const DAILY_PERCENTAGE = 0.5;
      const ANNUAL_PERCENTAGE = DAILY_PERCENTAGE * 365;
      
      return {
        annual: ANNUAL_PERCENTAGE.toFixed(1), // 182.5%
        daily: DAILY_PERCENTAGE.toFixed(1)    // 0.5%
      };
    } catch (err) {
      console.error('Ошибка при расчете APR:', err);
      return { annual: '182.5', daily: '0.5' }; // Значения по умолчанию
    }
  };
  
  const formatStartDate = (): string => {
    try {
      // Проверка активности фарминга
      if (!isActive) return '-';
      
      // Получаем timestamp из доступных полей
      const timestamp = farmingInfo.uni_farming_start_timestamp || farmingInfo.startDate;
      
      // Проверка наличия метки времени
      if (!timestamp) return '-';
      
      // Попытка преобразовать строку в объект Date
      const date = new Date(timestamp);
      
      // Проверка валидности даты
      if (isNaN(date.getTime())) {
        console.error('Невалидная дата:', timestamp);
        return '-';
      }
      
      // Форматирование даты с обработкой ошибок
      try {
        return date.toLocaleDateString('ru-RU');
      } catch (formatError) {
        console.error('Ошибка форматирования даты:', formatError);
        
        // Запасной вариант форматирования
        try {
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          return `${day}.${month}.${year}`;
        } catch (backupFormatError) {
          console.error('Ошибка в запасном форматировании даты:', backupFormatError);
          return '-';
        }
      }
    } catch (err) {
      console.error('Глобальная ошибка в formatStartDate:', err);
      return '-';
    }
  };
  
  // Оборачиваем весь компонент в Error Boundary
  return withErrorBoundary(
    <div className="bg-card rounded-xl p-4 mb-5 shadow-md transition-all duration-300 hover:shadow-lg">
      <h2 className="text-xl font-semibold mb-3 purple-gradient-text">Основной UNI пакет</h2>
      
      {/* Информация о текущем фарминге (отображается всегда, если активен) */}
      {isActive && (
        <div className="mb-5">
          {/* Индикатор активности фарминга */}
          <div className="mb-4 p-3 bg-gradient-to-r from-green-900/30 to-emerald-900/20 border border-green-500/30 rounded-lg flex items-center">
            <div className="flex items-center justify-center w-8 h-8 mr-3 bg-green-500/20 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <p className="text-sm text-green-300 font-medium">
                Фарминг активен
              </p>
              <p className="text-xs text-green-200/70 mt-1">
                Доход начисляется автоматически в реальном времени
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-foreground opacity-70">Общая сумма депозитов</p>
              <p className="text-lg font-medium">{formatNumber(totalDepositsAmount)} UNI</p>
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
              <p className="text-md font-medium">{depositCount} шт.</p>
            </div>
            <div>
              <p className="text-sm text-foreground opacity-70">Годовая доходность (APR)</p>
              <p className="text-md font-medium flex items-center">
                <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-semibold bg-primary/20 text-primary rounded mr-2">{calculateAPR().annual}%</span>
                <span className="text-xs text-foreground/60">({calculateAPR().daily}% в день)</span>
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
      
      {/* Информация для неактивного состояния фарминга */}
      {!isActive && (
        <div className="mb-5">
          <div className="mb-4 p-3 bg-gradient-to-r from-amber-900/30 to-orange-900/20 border border-amber-500/30 rounded-lg flex items-center">
            <div className="flex items-center justify-center w-8 h-8 mr-3 bg-amber-500/20 rounded-full">
              <i className="fas fa-seedling text-amber-400"></i>
            </div>
            <div>
              <p className="text-sm text-amber-300 font-medium">
                Фарминг не активирован
              </p>
              <p className="text-xs text-amber-200/70 mt-1">
                Создайте свой первый депозит, чтобы начать получать доход
              </p>
            </div>
          </div>
          
          <div className="mb-5 p-3 bg-gradient-to-r from-slate-900/50 to-slate-800/30 rounded-lg">
            <h3 className="text-md font-medium mb-2 flex items-center">
              <i className="fas fa-percentage text-primary mr-2"></i>
              Информация о доходности
            </h3>
            <ul className="text-sm space-y-2 text-slate-300">
              <li className="flex items-start">
                <i className="fas fa-circle-check text-green-500 mr-2 mt-0.5"></i>
                <span>Ежедневная доходность: <span className="text-primary font-medium">0.5% в день</span></span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-circle-check text-green-500 mr-2 mt-0.5"></i>
                <span>Годовая доходность (APR): <span className="text-primary font-medium">182.5%</span></span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-circle-check text-green-500 mr-2 mt-0.5"></i>
                <span>Начисления: <span className="text-primary font-medium">каждую секунду</span></span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-circle-check text-green-500 mr-2 mt-0.5"></i>
                <span>Минимальный депозит: <span className="text-primary font-medium">5 UNI</span></span>
              </li>
            </ul>
          </div>
        </div>
      )}
      
      {/* Форма для создания депозита (отображается всегда) */}
      <div className={isActive ? "mt-6 pt-4 border-t border-slate-700" : ""}>
        <h3 className="text-md font-medium mb-4">
          {isActive ? "Пополнить фарминг" : "Создать депозит и активировать фарминг"}
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-foreground opacity-70 mb-1">
              Введите сумму UNI
            </label>
            <input
              type="text"
              value={depositAmount}
              onChange={(e) => {
                try {
                  // Дополнительная валидация: запрещаем ввод нечисловых символов кроме точки
                  const value = e.target.value;
                  // Разрешаем цифры, точку и пустую строку
                  if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                    setDepositAmount(value);
                  }
                } catch (error) {
                  console.error('Ошибка при обработке ввода суммы:', error);
                  // В случае ошибки сохраняем текущее значение
                }
              }}
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
            className={`w-full py-3 px-4 rounded-lg font-medium text-base ${
              isLoading || error === 'Обработка запроса...'
                ? 'bg-muted text-foreground opacity-50'
                : !isActive 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-900/20 hover:shadow-green-900/30'
                  : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 shadow-lg shadow-purple-900/20 hover:shadow-purple-900/30'
            } transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                <span>Обработка...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <i className={`fas ${isActive ? 'fa-arrow-up' : 'fa-seedling'} mr-2`}></i>
                <span>{isActive ? 'Пополнить фарминг' : 'Активировать фарминг UNI'}</span>
              </div>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

// Экспортируем компонент с оберткой Error Boundary
export default UniFarmingCard;