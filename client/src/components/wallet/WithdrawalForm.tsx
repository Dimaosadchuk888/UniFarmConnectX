import React, { useState, useEffect } from 'react';
import { useUser } from '@/contexts/userContext';
import { useNotification } from '@/contexts/NotificationContext';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Схема валидации для формы вывода средств
const withdrawalFormSchema = z.object({
  walletAddress: z.string().min(10, 'Адрес кошелька слишком короткий'),
  amount: z.number().min(0.001, 'Минимальная сумма для вывода: 0.001'),
  currency: z.enum(['UNI', 'TON'])
});

type WithdrawalFormData = z.infer<typeof withdrawalFormSchema>;

// Состояния отправки формы
enum SubmitState {
  IDLE = 'idle',
  SUBMITTING = 'submitting',
  SUCCESS = 'success',
  ERROR = 'error'
}

/**
 * Компонент формы для вывода средств согласно UX спецификации
 * Включает селектор валюты, валидацию и анимированные состояния
 */
const WithdrawalForm: React.FC = () => {
  // Получаем данные пользователя и баланса из контекста
  const { 
    userId, 
    uniBalance, 
    tonBalance, 
    refreshBalance,
    walletAddress 
  } = useUser();
  
  // Базовые состояния формы и UI
  const [selectedCurrency, setSelectedCurrency] = useState<'UNI' | 'TON'>('TON');
  const [submitState, setSubmitState] = useState<SubmitState>(SubmitState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  
  // Состояния для анимаций и эффектов фокуса
  const [addressFocused, setAddressFocused] = useState(false);
  const [amountFocused, setAmountFocused] = useState(false);
  
  // Хук для отображения уведомлений
  const { showNotification } = useNotification();
  
  // Настройка формы с валидацией
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    reset,
    clearErrors
  } = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalFormSchema),
    defaultValues: {
      walletAddress: walletAddress || '',
      amount: 0.001,
      currency: selectedCurrency
    },
    mode: 'onChange'
  });
  
  // Следим за изменениями суммы
  const watchedAmount = watch('amount');
  
  // Получаем доступный баланс для выбранной валюты
  const getAvailableBalance = () => {
    return selectedCurrency === 'UNI' ? uniBalance : tonBalance;
  };
  
  // Минимальные суммы для вывода
  const getMinAmount = () => {
    return selectedCurrency === 'UNI' ? 1 : 0.001;
  };
  
  // Обработчик переключения валюты
  const handleCurrencyChange = (currency: 'UNI' | 'TON') => {
    setSelectedCurrency(currency);
    setValue('currency', currency);
    setValue('amount', getMinAmount());
    clearErrors();
    setErrorMessage(null);
    
    showNotification({type: 'info', {
      message: `Переключено на ${currency}`,
      duration: 2000
    });
  };
  
  // Валидация TON адреса
  const validateTonAddress = (address: string): boolean => {
    // Простая валидация TON адреса (начинается с UQ или EQ, длина 48 символов)
    const tonAddressRegex = /^(UQ|EQ)[A-Za-z0-9_-]{46}$/;
    return tonAddressRegex.test(address);
  };
  
  // Обработчик отправки формы
  const onSubmit = async (data: WithdrawalFormData) => {
    setSubmitState(SubmitState.SUBMITTING);
    setErrorMessage(null);
    
    try {
      // Дополнительная валидация
      if (data.amount > getAvailableBalance()) {
        throw new Error(`Недостаточно средств. Доступно: ${getAvailableBalance()} ${selectedCurrency}`);
      }
      
      if (data.amount < getMinAmount()) {
        throw new Error(`Минимальная сумма для вывода: ${getMinAmount()} ${selectedCurrency}`);
      }
      
      if (selectedCurrency === 'TON' && !validateTonAddress(data.walletAddress)) {
        throw new Error('Неверный формат TON адреса');
      }
      
      // Имитация отправки запроса на сервер
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Генерируем ID транзакции для демонстрации
      const newTransactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setTransactionId(newTransactionId);
      
      setSubmitState(SubmitState.SUCCESS);
      
      // Показываем уведомление об успешной отправке
      showNotification({type: 'success', {
        message: `Заявка на вывод ${data.amount} ${selectedCurrency} создана успешно!`,
        duration: 5000
      });
      
      // Очищаем форму после успешной отправки
      setTimeout(() => {
        reset({
          walletAddress: walletAddress || '',
          amount: getMinAmount(),
          currency: selectedCurrency
        });
        setSubmitState(SubmitState.IDLE);
        setTransactionId(null);
      }, 3000);
      
      // Обновляем баланс
      refreshBalance();
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setErrorMessage(errorMsg);
      setSubmitState(SubmitState.ERROR);
      
      showNotification({type: 'error', {
        message: `Ошибка создания заявки: ${errorMsg}`,
        duration: 5000
      });
      
      // Сбрасываем состояние ошибки через 5 секунд
      setTimeout(() => {
        setSubmitState(SubmitState.IDLE);
        setErrorMessage(null);
      }, 5000);
    }
  };
  
  // Автозаполнение адреса кошелька при изменении
  useEffect(() => {
    if (walletAddress) {
      setValue('walletAddress', walletAddress);
    }
  }, [walletAddress, setValue]);
  
  // Обновляем валюту в форме при изменении
  useEffect(() => {
    setValue('currency', selectedCurrency);
  }, [selectedCurrency, setValue]);

  return (
    <div className="bg-card rounded-xl p-5 mb-5 shadow-lg overflow-hidden relative">
      {/* Неоновая рамка с градиентом */}
      <div className="absolute inset-0 rounded-xl border border-primary/30"></div>
      
      {/* Заголовок секции */}
      <h2 className="text-lg font-semibold text-white mb-4 relative z-10 flex items-center">
        <i className="fas fa-money-bill-wave text-primary mr-2"></i>
        Вывод средств
      </h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative z-10">
        {/* Селектор валюты */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Выберите валюту для вывода:
          </label>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => handleCurrencyChange('UNI')}
              className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
                selectedCurrency === 'UNI'
                  ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25'
                  : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-primary/50'
              }`}
            >
              UNI
            </button>
            <button
              type="button"
              onClick={() => handleCurrencyChange('TON')}
              className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
                selectedCurrency === 'TON'
                  ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/25'
                  : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-blue-500/50'
              }`}
            >
              TON
            </button>
          </div>
        </div>
        
        {/* Поле адреса кошелька */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Адрес кошелька {selectedCurrency}:
          </label>
          <div className="relative">
            <Input
              {...register('walletAddress')}
              type="text"
              placeholder={selectedCurrency === 'TON' ? 'UQA1...xyz' : 'Адрес UNI кошелька'}
              className={`w-full bg-gray-800 border-gray-600 text-white placeholder-gray-400 transition-all duration-200 ${
                addressFocused ? 'border-primary shadow-lg shadow-primary/25' : ''
              } ${errors.walletAddress ? 'border-red-500' : ''}`}
              onFocus={() => setAddressFocused(true)}
              onBlur={() => setAddressFocused(false)}
            />
            {errors.walletAddress && (
              <p className="text-red-400 text-xs mt-1">{errors.walletAddress.message}</p>
            )}
          </div>
        </div>
        
        {/* Поле суммы */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Сумма для вывода:
          </label>
          <div className="relative">
            <Input
              {...register('amount', { valueAsNumber: true })}
              type="number"
              step={selectedCurrency === 'TON' ? '0.001' : '1'}
              min={getMinAmount()}
              max={getAvailableBalance()}
              placeholder={`${getMinAmount()}`}
              className={`w-full bg-gray-800 border-gray-600 text-white placeholder-gray-400 pr-16 transition-all duration-200 ${
                amountFocused ? 'border-primary shadow-lg shadow-primary/25' : ''
              } ${errors.amount ? 'border-red-500' : ''}`}
              onFocus={() => setAmountFocused(true)}
              onBlur={() => setAmountFocused(false)}
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
              {selectedCurrency}
            </span>
            {errors.amount && (
              <p className="text-red-400 text-xs mt-1">{errors.amount.message}</p>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Доступно: {getAvailableBalance().toFixed(selectedCurrency === 'TON' ? 6 : 2)} {selectedCurrency}
          </p>
        </div>
        
        {/* Сообщение об ошибке */}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {errorMessage}
          </div>
        )}
        
        {/* Сообщение об успехе */}
        {submitState === SubmitState.SUCCESS && transactionId && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-green-400 text-sm">
            <i className="fas fa-check-circle mr-2"></i>
            Заявка создана! ID: {transactionId}
          </div>
        )}
        
        {/* Кнопка отправки */}
        <Button
          type="submit"
          disabled={!isValid || submitState === SubmitState.SUBMITTING}
          className={`w-full transition-all duration-300 ${
            submitState === SubmitState.SUBMITTING
              ? 'bg-gray-600 cursor-not-allowed'
              : submitState === SubmitState.SUCCESS
              ? 'bg-green-500 hover:bg-green-600'
              : submitState === SubmitState.ERROR
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-primary hover:bg-primary/80'
          }`}
        >
          {submitState === SubmitState.SUBMITTING ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Отправка...
            </>
          ) : submitState === SubmitState.SUCCESS ? (
            <>
              <i className="fas fa-check mr-2"></i>
              Заявка создана
            </>
          ) : submitState === SubmitState.ERROR ? (
            <>
              <i className="fas fa-exclamation-triangle mr-2"></i>
              Повторить
            </>
          ) : (
            <>
              <i className="fas fa-money-bill-wave mr-2"></i>
              Создать заявку
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default WithdrawalForm;