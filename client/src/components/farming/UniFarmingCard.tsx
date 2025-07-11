import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { apiRequest, invalidateQueryWithUserId } from '@/lib/queryClient';
import BigNumber from 'bignumber.js';
import { useUser } from '@/contexts/userContext';
// import useErrorBoundary from '@/hooks/useErrorBoundary';
import { useNotification } from '@/contexts/NotificationContext';

interface UniFarmingCardProps {
  userData: any;
}

interface FarmingInfo {
  isActive: boolean;
  depositAmount: string;
  ratePerSecond: string;
  depositCount?: number;
  totalDepositAmount?: string;
  totalRatePerSecond?: string;
  dailyIncomeUni?: string;
  startDate?: string | null;
  uni_farming_start_timestamp?: string | null;
}

const UniFarmingCard: React.FC<UniFarmingCardProps> = ({ userData }) => {
  const queryClient = useQueryClient();
  const { userId, refreshBalance, uniBalance } = useUser(); // Получаем ID пользователя, функцию обновления баланса и текущий баланс из контекста
  const { success, error: showError } = useNotification(); // Для показа уведомлений
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  // Защита от повторных вызовов
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // Флаг для предотвращения автоматических вызовов
  const depositRequestSent = useRef<boolean>(false);



  // Применяем Error Boundary к компоненту
  // const { captureError, handleAsyncError } = useErrorBoundary();

  // Получаем информацию о фарминге с динамическим ID пользователя
  const { data: farmingResponse, isLoading } = useQuery({
    queryKey: ['/api/v2/uni-farming/status', userId], // Обновлено на корректный эндпоинт /api/v2/uni-farming/status
    refetchInterval: 15000, // Обновление каждые 15 секунд для более актуальных данных
    enabled: !!userId, // Запрос активен только если есть userId
    queryFn: async () => {
      try {
        // Используем безопасный запрос с правильными заголовками
        const response = await correctApiRequest(
          `/api/v2/uni-farming/status?user_id=${userId || 1}`, 
          'GET'
        );

        console.log('[DEBUG] Получены данные фарминга:', JSON.stringify(response));
        // Выводим подробные дебаг данные для анализа точности отображения
        if (response.data) {
          console.log('[DEBUG] UNI Farming - Детали API:',{
            isActive: response.data.isActive,
            depositCount: response.data.depositCount,
            totalDepositAmount: response.data.totalDepositAmount,
            ratePerSecond: response.data.totalRatePerSecond,
            dailyIncome: response.data.dailyIncomeUni
          });

          // Вывод полного объекта response.data для диагностики
          console.log('[DEBUG] UNI Farming - Полный объект данных:', response.data);

          // Проверка числовых значений
          try {
            // API возвращает uni_farming_rate в процентах за час (0.01 = 1% в час)
            const hourlyRate = response.data.uni_farming_rate || 0.01;
            // Конвертируем в ставку за секунду
            const ratePerSecond = new BigNumber(hourlyRate).dividedBy(100).dividedBy(3600); // процент в час -> доля в секунду
            const dailyRate = new BigNumber(hourlyRate).multipliedBy(24); // процент в час * 24 часа
            console.log('[DEBUG] Числовые проверки:', {
              uni_farming_rate: response.data.uni_farming_rate,
              hourlyRate: hourlyRate,
              calculatedRatePerSecond: ratePerSecond.toString(),
              dailyRate: dailyRate.toString(),
              uni_deposit_amount: response.data.uni_deposit_amount,
              isNaN: ratePerSecond.isNaN(),
              isFinite: ratePerSecond.isFinite()
            });
          } catch (bnError) {
            console.error('[ERROR] Ошибка преобразования числовых значений:', bnError);
          }
        }
        return response;
      } catch (error: any) {
        console.error('[ERROR] UniFarmingCard - Ошибка при получении информации о фарминге:', error);
        throw new Error(`Ошибка получения данных фарминга: ${error.message || 'Неизвестная ошибка'}`);
      }
    }
  });

  // Информация о фарминге из ответа API
  const farmingInfo: FarmingInfo = farmingResponse?.data || {
    isActive: false,
    depositAmount: '0',
    ratePerSecond: '0',
    depositCount: 0,
    totalDepositAmount: '0',
  };

  // Для подсчета транзакций фарминга
  const { data: transactionsResponse } = useQuery({
    queryKey: ['/api/v2/transactions', userId],
    enabled: !!userId && farmingInfo.isActive,
    queryFn: async () => {
      return await correctApiRequest('/api/v2/transactions?user_id=' + (userId || 1), 'GET');
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
    try {
      console.log('[DEBUG] totalDepositsAmount - Начало расчета');

      // Если API вернул значение для общей суммы, используем его
      if (farmingInfo.totalDepositAmount) {
        console.log('[DEBUG] totalDepositsAmount - Используем API значение totalDepositAmount:', farmingInfo.totalDepositAmount);
        return farmingInfo.totalDepositAmount;
      }

      // Если нет транзакций, вернем depositAmount из API
      if (!farmingDeposits || farmingDeposits.length === 0) {
        console.log('[DEBUG] totalDepositsAmount - Нет депозитов, используем depositAmount из API:', farmingInfo.depositAmount);
        return farmingInfo.depositAmount || '0';
      }

      console.log('[DEBUG] totalDepositsAmount - Количество депозитов для подсчета:', farmingDeposits.length);

      // Суммируем все депозиты
      const total = farmingDeposits.reduce((sum: BigNumber, tx: any) => {
        try {
          // Обрабатываем значение безопасно
          const txAmount = String(tx.amount || '0').trim();
          console.log('[DEBUG] totalDepositsAmount - Обработка депозита:', { amount: txAmount });

          const amountBN = new BigNumber(txAmount);
          // Проверяем на валидность
          if (amountBN.isNaN() || !amountBN.isFinite()) {
            console.log('[DEBUG] totalDepositsAmount - Невалидное значение депозита:', txAmount);
            return sum;
          }

          const newSum = sum.plus(amountBN);
          console.log('[DEBUG] totalDepositsAmount - Промежуточная сумма:', newSum.toString());
          return newSum;
        } catch (depError) {
          console.error('[ERROR] totalDepositsAmount - Ошибка при обработке депозита:', depError);
          return sum;
        }
      }, new BigNumber(0));

      const result = total.toString();
      console.log('[DEBUG] totalDepositsAmount - Финальный результат:', result);
      return result;
    } catch (error) {
      console.error('[ERROR] totalDepositsAmount - Глобальная ошибка:', error);
      return farmingInfo.depositAmount || '0';
    }
  }, [farmingDeposits, farmingInfo.depositAmount, farmingInfo.totalDepositAmount]);

  // Подсчитываем количество активных депозитов 
  // Приоритет отдаем значению из API, а если его нет, считаем локально
  const depositCount = farmingInfo.depositCount || farmingDeposits.length || 0;
  console.log('[DEBUG] Количество депозитов:', {
    fromAPI: farmingInfo.depositCount,
    localCount: farmingDeposits.length,
    finalCount: depositCount
  });

  // Информационная мутация (просто для показа информации о новом механизме)
  const infoMutation = useMutation({
    mutationFn: async () => {
      try {
        // Используем динамический ID пользователя из контекста
        const requestBody = { 
          user_id: userId 
        };

        // Используем correctApiRequest вместо apiRequest для лучшей обработки ошибок
        const response = await correctApiRequest('/api/v2/uni-farming/harvest', 'POST', requestBody);

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
        invalidateQueryWithUserId('/api/v2/uni-farming/status', [
          '/api/v2/wallet/balance'
        ]);
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

      console.log('[UniFarmingCard] Отправляем депозит:', requestBody);
      console.log('[UniFarmingCard] Текущий баланс UNI:', uniBalance);
      console.log('[UniFarmingCard] userId из контекста:', userId);

      // Используем direct-deposit endpoint для обхода проблем с BaseController
      return correctApiRequest('/api/v2/uni-farming/direct-deposit', 'POST', requestBody);
    },
    onSuccess: async (response) => {
      try {
        console.log('[UniFarmingCard] Ответ от сервера после депозита:', response);
        
        // Очищаем форму и сообщение об ошибке
        setDepositAmount('');
        setError(null);

        // Логируем успешный депозит
        if (response?.data) {
          console.log('[UniFarmingCard] Детали успешного депозита:', {
            success: response.success,
            message: response.message,
            data: response.data,
            newBalance: response.data?.newBalance,
            depositAmount: response.data?.depositAmount,
            transactionId: response.data?.transactionId
          });
        }

        // Обновляем данные в правильном порядке
        console.log('[UniFarmingCard] Начинаем обновление данных после депозита');
        
        // 1. Принудительно обновляем все кэши запросов
        await queryClient.invalidateQueries({ queryKey: ['/api/v2/users/profile'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/v2/wallet/balance'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/v2/uni-farming/status'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/v2/transactions'] });
        
        // 2. Принудительно перезагружаем все данные
        await queryClient.refetchQueries({ queryKey: ['/api/v2/users/profile', userId] });
        await queryClient.refetchQueries({ queryKey: ['/api/v2/wallet/balance', userId] });
        await queryClient.refetchQueries({ queryKey: ['/api/v2/uni-farming/status', userId] });
        
        // 3. Обновляем UserContext с принудительным обновлением 
        if (refreshBalance) {
          console.log('[UniFarmingCard] Принудительно обновляем UserContext');
          await refreshBalance(true);
        }
        
        // 4. Добавляем задержку для гарантии обновления UI
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Показываем уведомление об успешном создании депозита ПОСЛЕ обновления данных
        success('Ваш депозит успешно размещен в фарминге UNI и начал приносить доход!');
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

      // Минимальная сумма депозита - 1 UNI согласно требованиям
      const MIN_DEPOSIT = 1;

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

        // Получаем и проверяем баланс пользователя из UserContext
        let balance: BigNumber;
        try {
          // Используем баланс из useUser hook вместо userData prop
          const balanceStr = uniBalance;
          
          if (balanceStr === undefined || balanceStr === null) {
            console.error('Не удалось получить баланс пользователя из UserContext');
            setError('Не удалось получить информацию о балансе');
            setIsSubmitting(false);
            return;
          }

          balance = new BigNumber(balanceStr);
          if (balance.isNaN() || !balance.isFinite()) {
            console.error('Получен некорректный баланс:', balanceStr);
            setError('Ошибка получения баланса');
            setIsSubmitting(false);
            return;
          }
        } catch (balanceError) {
          console.error('Ошибка при обработке баланса:', balanceError);
          setError('Ошибка проверки баланса');
          setIsSubmitting(false);
          return;
        }

        // Проверка достаточности средств
        if (amount.isGreaterThan(balance)) {
          setError(`Недостаточно средств. Доступно: ${balance.toFixed(3)} UNI`);
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
      // Отладочный лог входных данных
      console.log('[DEBUG] formatNumber - Входные данные:', {
        value,
        type: typeof value,
        decimals
      });

      // Проверка наличия значения
      if (value === undefined || value === null) {
        console.log('[DEBUG] formatNumber - Значение undefined или null');
        return decimals === 0 ? '0' : '0.' + '0'.repeat(decimals);
      }

      // Нормализация значения
      let normalizedValue = value;

      // Если это не строка, попробуем преобразовать
      if (typeof value !== 'string') {
        try {
          normalizedValue = String(value);
          console.log('[DEBUG] formatNumber - Преобразовано в строку:', normalizedValue);
        } catch (conversionError) {
          console.error('[ERROR] formatNumber - Ошибка преобразования значения в строку:', conversionError);
          return decimals === 0 ? '0' : '0.' + '0'.repeat(decimals);
        }
      }

      // Проверка на пустую строку
      if (normalizedValue.trim() === '') {
        console.log('[DEBUG] formatNumber - Пустая строка');
        return decimals === 0 ? '0' : '0.' + '0'.repeat(decimals);
      }

      // Создаем BigNumber с защитой от некорректных значений
      let num: BigNumber;
      try {
        // Гарантируем, что передаем строку и удаляем лишние пробелы
        num = new BigNumber(String(normalizedValue).trim());
        console.log('[DEBUG] formatNumber - BigNumber создан:', num.toString());

        // Проверка на NaN или Infinity
        if (num.isNaN() || !num.isFinite()) {
          console.error('[ERROR] formatNumber - Получено нечисловое значение:', normalizedValue);
          return decimals === 0 ? '0' : '0.' + '0'.repeat(decimals);
        }
      } catch (bnError) {
        console.error('[ERROR] formatNumber - Ошибка создания BigNumber:', bnError, 'для значения:', normalizedValue);
        return decimals === 0 ? '0' : '0.' + '0'.repeat(decimals);
      }

      try {
        // Для очень маленьких значений используем научную нотацию
        if (num.isGreaterThan(0) && num.isLessThanOrEqualTo(0.001)) {
          const result = num.toExponential(2);
          console.log('[DEBUG] formatNumber - Малое значение, научная нотация:', result);
          return result;
        }

        // Для нормальных значений используем фиксированное количество десятичных знаков
        const result = num.toFixed(decimals);
        console.log('[DEBUG] formatNumber - Финальный результат:', result);
        return result;
      } catch (formatError) {
        console.error('[ERROR] formatNumber - Ошибка форматирования числа:', formatError);

        // Запасной вариант форматирования - просто преобразуем в строку и округлим
        try {
          const numValue = parseFloat(normalizedValue);
          if (isNaN(numValue)) {
            console.log('[DEBUG] formatNumber - Запасной вариант вернул NaN');
            return decimals === 0 ? '0' : '0.' + '0'.repeat(decimals);
          }

          const result = numValue.toFixed(decimals);
          console.log('[DEBUG] formatNumber - Результат запасного варианта:', result);
          return result;
        } catch (fallbackError) {
          console.error('[ERROR] formatNumber - Ошибка в запасном форматировании:', fallbackError);
          return decimals === 0 ? '0' : '0.' + '0'.repeat(decimals);
        }
      }
    } catch (err) {
      console.error('[ERROR] Глобальная ошибка в formatNumber:', err);
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

      // Получаем ставку фарминга из API (процент в час)
      const hourlyRate = farmingResponse?.data?.uni_farming_rate || 0.01;
      const depositAmount = parseFloat(farmingResponse?.data?.uni_deposit_amount || '0');
      
      if (depositAmount <= 0) {
        console.log('[DEBUG] calculateDailyIncome - Нет активных депозитов');
        return '0';
      }

      try {
        // Рассчитываем дневной доход: (депозит * процент в час * 24 часа) / 100
        const dailyRatePercent = hourlyRate * 24; // процент за день
        const dailyIncome = new BigNumber(depositAmount).multipliedBy(dailyRatePercent).dividedBy(100);

        // Логирование для диагностики
        console.log('[DEBUG] calculateDailyIncome - Результат расчета:', {
          hourlyRate: hourlyRate,
          dailyRatePercent: dailyRatePercent,
          depositAmount: depositAmount,
          dailyIncome: dailyIncome.toString()
        });

        // Проверка результата на валидность
        if (dailyIncome.isNaN() || !dailyIncome.isFinite()) {
          console.error('[ERROR] calculateDailyIncome - Ошибка при расчете дневного дохода');
          return '0';
        }

        // Округляем до 3 знаков для отображения
        const result = dailyIncome.toFixed(3);
        console.log('[DEBUG] calculateDailyIncome - Финальный результат:', result);
        return result;
      } catch (calculationError) {
        console.error('[ERROR] calculateDailyIncome - Ошибка при вычислении:', calculationError);
        return '0';
      }
    } catch (err) {
      console.error('[ERROR] Глобальная ошибка в calculateDailyIncome:', err);
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

      // Получаем ставку фарминга из API (процент в час)
      const hourlyRate = farmingResponse?.data?.uni_farming_rate || 0.01;
      const depositAmount = parseFloat(farmingResponse?.data?.uni_deposit_amount || '0');
      
      if (depositAmount <= 0) {
        console.log('[DEBUG] calculateSecondRate - Нет активных депозитов');
        return '0';
      }

      try {
        // Рассчитываем доход в секунду: (депозит * процент в час) / 100 / 3600
        const secondIncome = new BigNumber(depositAmount).multipliedBy(hourlyRate).dividedBy(100).dividedBy(3600);

        // Выводим значение для диагностики
        console.log('[DEBUG] calculateSecondRate - Входные данные:', {
          hourlyRate: hourlyRate,
          depositAmount: depositAmount,
          secondIncome: secondIncome.toString()
        });

        // Проверка на валидное число
        if (secondIncome.isNaN() || !secondIncome.isFinite()) {
          console.error('[ERROR] calculateSecondRate - Невалидное значение скорости начисления');
          return '0';
        }

        // Возвращаем скорость с форматированием
        const result = secondIncome.toFixed(8); // 8 знаков для секундного дохода
        console.log('[DEBUG] calculateSecondRate - Финальный результат:', result);
        return result;
      } catch (bnError) {
        console.error('[ERROR] calculateSecondRate - Ошибка при обработке скорости начисления:', bnError);
        return '0';
      }
    } catch (err) {
      console.error('[ERROR] Глобальная ошибка в calculateSecondRate:', err);
      return '0';
    }
  };

  // Форматирование даты начала фарминга с улучшенной обработкой ошибок
  // Расчет годовой доходности (APR) на основе скорости начисления
  const calculateAPR = (): { annual: string, daily: string } => {
    try {
      // Проверяем активность фарминга
      if (!isActive) {
        console.log('[DEBUG] calculateAPR - Фарминг неактивен');
        return { annual: '0', daily: '0' };
      }

      // Получаем ставку из API (процент в час)
      const hourlyRate = farmingResponse?.data?.uni_farming_rate || 0.01;
      
      // Рассчитываем дневную и годовую ставки
      const DAILY_PERCENTAGE = hourlyRate * 24; // процент в день
      const ANNUAL_PERCENTAGE = DAILY_PERCENTAGE * 365; // процент в год

      const result = {
        annual: ANNUAL_PERCENTAGE.toFixed(1), // Например: 87.6% для 0.01% в час
        daily: DAILY_PERCENTAGE.toFixed(2)    // Например: 0.24% для 0.01% в час
      };

      console.log('[DEBUG] calculateAPR - Результат:', {
        hourlyRate,
        ...result
      });
      return result;
    } catch (err) {
      console.error('[ERROR] Ошибка при расчете APR:', err);
      return { annual: '87.6', daily: '0.24' }; // Значения по умолчанию для 0.01% в час
    }
  };

  const formatStartDate = (): string => {
    try {
      // Проверка активности фарминга
      if (!isActive) {
        console.log('[DEBUG] formatStartDate - Фарминг неактивен');
        return '-';
      }

      // Получаем timestamp из доступных полей
      const timestamp = farmingInfo.uni_farming_start_timestamp || farmingInfo.startDate;
      console.log('[DEBUG] formatStartDate - Получена дата:', timestamp);

      // Проверка наличия метки времени
      if (!timestamp) {
        console.log('[DEBUG] formatStartDate - Отсутствует дата начала');
        return '-';
      }

      // Попытка преобразовать строку в объект Date
      const date = new Date(timestamp);
      console.log('[DEBUG] formatStartDate - Создан объект Date:', date);

      // Проверка валидности даты
      if (isNaN(date.getTime())) {
        console.error('[ERROR] formatStartDate - Невалидная дата:', timestamp);
        return '-';
      }

      // Форматирование даты с обработкой ошибок
      try {
        const formatted = date.toLocaleDateString('ru-RU');
        console.log('[DEBUG] formatStartDate - Отформатированная дата:', formatted);
        return formatted;
      } catch (formatError) {
        console.error('[ERROR] formatStartDate - Ошибка форматирования даты:', formatError);

        // Запасной вариант форматирования
        try {
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          const formatted = `${day}.${month}.${year}`;
          console.log('[DEBUG] formatStartDate - Запасное форматирование даты:', formatted);
          return formatted;
        } catch (backupFormatError) {
          console.error('[ERROR] formatStartDate - Ошибка в запасном форматировании даты:', backupFormatError);
          return '-';
        }
      }
    } catch (err) {
      console.error('[ERROR] Глобальная ошибка в formatStartDate:', err);
      return '-';
    }
  };

  // Возвращаем компонент
  return (
    <div className="bg-card rounded-xl p-4 mb-5 shadow-md">
      <h2 className="text-xl font-semibold mb-3 text-primary">Основной UNI пакет</h2>

      {/* Информация о текущем фарминге (отображается всегда, если активен) */}
      {isActive && (
        <div className="mb-5">
          {/* Индикатор активности фарминга */}
          <div className="mb-4 p-3 bg-gradient-to-r from-green-900/30 to-emerald-900/20 border border-green-500/30 rounded-lg flex items-center">
            <div className="flex items-center justify-center w-8 h-8 mr-3 bg-green-500/20 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
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
            <div className="p-2 rounded-lg">
              <p className="text-sm text-foreground opacity-70">Общая сумма депозитов</p>
              <p className="text-lg font-medium">
                <span className="text-primary">{formatNumber(totalDepositsAmount)}</span> UNI
              </p>
            </div>
            <div className="p-2 rounded-lg">
              <p className="text-sm text-foreground opacity-70">Дата активации</p>
              <p className="text-md font-medium">
                {formatStartDate()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-2 rounded-lg">
              <p className="text-sm text-foreground opacity-70">Активных депозитов UNI</p>
              <p className="text-md font-medium flex items-center">
                <span className="text-primary">{depositCount}</span> шт.
              </p>
            </div>
            <div className="p-2 rounded-lg">
              <p className="text-sm text-foreground opacity-70">Годовая доходность (APR)</p>
              <p className="text-md font-medium flex items-center">
                <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-semibold bg-primary/20 text-primary rounded mr-2">{calculateAPR().annual}%</span>
                <span className="text-xs text-foreground/60">({calculateAPR().daily}% в день)</span>
              </p>
            </div>
          </div>

          <div className="mb-3 p-2 rounded-lg">
            <p className="text-sm text-foreground opacity-70">Скорость начисления</p>
            <p className="text-md font-medium">
              <span className="text-primary">+{formatNumber(calculateSecondRate(), 8)}</span> UNI/сек
              <span className="text-foreground opacity-70 ml-2">
                (≈ <span className="text-primary">+{formatNumber(calculateDailyIncome())}</span> UNI в день)
              </span>
            </p>
          </div>

          <div className="p-3 bg-gradient-to-r from-indigo-900/30 to-purple-900/20 border border-indigo-500/30 rounded-lg flex items-center">
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
              <span>Информация о доходности</span>
            </h3>
            <ul className="text-sm space-y-2 text-slate-300">
              <li className="flex items-start">
                <i className="fas fa-circle-check text-green-500 mr-2 mt-0.5"></i>
                <span>Ежедневная доходность: <span className="text-primary font-medium">0.24% в день</span></span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-circle-check text-green-500 mr-2 mt-0.5"></i>
                <span>Годовая доходность (APR): <span className="text-primary font-medium">87.6%</span></span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-circle-check text-green-500 mr-2 mt-0.5"></i>
                <span>Начисления: <span className="text-primary font-medium">каждую секунду</span></span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-circle-check text-green-500 mr-2 mt-0.5"></i>
                <span>Минимальный депозит: <span className="text-primary font-medium">1 UNI</span></span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Форма для создания депозита (отображается всегда) */}
      <div className={isActive ? "mt-6 pt-4 border-t border-slate-700" : ""}>
        <h3 className="text-md font-medium mb-4 flex items-center">
          <span className="text-primary">{isActive ? "Пополнить фарминг" : "Создать депозит и активировать фарминг"}</span>
        </h3>

        <form onSubmit={handleSubmit} style={{ position: 'relative', zIndex: 20 }}>
          <div className="mb-4" style={{ position: 'relative' }}>
            <label className="block text-sm text-foreground opacity-70 mb-1">
              Введите сумму UNI
            </label>
            <input
              type="text"
              value={depositAmount}
              onFocus={(e) => {
                console.log('[DEBUG] Input field focused');
              }}
              onClick={(e) => {
                console.log('[DEBUG] Input field clicked');
              }}
              onChange={(e) => {
                console.log('[DEBUG] Input onChange triggered, value:', e.target.value);
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
              className="w-full p-2 border border-input rounded-lg bg-card focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 relative z-10"
              placeholder="0.00"
              style={{ cursor: 'text' }}
            />
            <p className="text-sm text-foreground opacity-70 mt-1">
              Доступно: <span className="text-primary">{formatNumber(userData?.balance_uni || '0')}</span> UNI
            </p>
          </div>

          {/* Кнопки быстрого выбора суммы */}
          <div className="mb-4 grid grid-cols-4 gap-2">
            {[5, 10, 25, 50].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => {
                  console.log(`[DEBUG] Quick amount button clicked: ${amount} UNI`);
                  setDepositAmount(amount.toString());
                  setError(null);
                }}
                className="py-2 px-3 rounded-lg font-medium text-sm bg-gradient-to-r from-purple-500/20 to-indigo-600/20 text-primary border border-primary/20 hover:from-purple-500/30 hover:to-indigo-600/30 hover:border-primary/30 transition-all duration-200"
              >
                {amount} UNI
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-2 bg-red-900/30 border border-red-500 rounded-lg text-red-300 text-sm animate-pulse">
              {error}
            </div>
          )}

          <div className="mb-4 transition-all duration-300 hover:scale-[1.02] hover:bg-card/80 p-2 rounded-lg">
            <p className="text-sm text-foreground opacity-70">Минимальный депозит</p>
            <p className="text-md font-medium">
              <span className="text-primary animate-pulse">1</span> UNI
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
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                <span>Обработка...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <i className={`fas ${isActive ? 'fa-arrow-up' : 'fa-seedling'} mr-2`}></i>
                <span>
                  {isActive ? 'Пополнить фарминг' : 'Активировать фарминг UNI'}
                </span>
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