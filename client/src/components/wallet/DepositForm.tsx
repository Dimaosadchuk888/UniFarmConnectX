import React, { useState, useEffect } from 'react';
import { useUser } from '@/contexts/userContext';
import { useNotification } from '@/contexts/NotificationContext';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Схема валидации для формы пополнения средств
const depositFormSchema = z.object({
  amount: z.number().min(0.001, 'Минимальная сумма для пополнения: 0.001'),
  currency: z.enum(['UNI', 'TON'])
});

type DepositFormData = z.infer<typeof depositFormSchema>;

// Состояния отправки формы
enum SubmitState {
  IDLE = 'idle',
  SUBMITTING = 'submitting',
  SUCCESS = 'success',
  ERROR = 'error'
}

interface DepositFormProps {
  initialCurrency?: 'UNI' | 'TON';
}

/**
 * Компонент формы для пополнения средств согласно UX спецификации
 * Включает селектор валюты, валидацию и анимированные состояния
 */
const DepositForm: React.FC<DepositFormProps> = ({ initialCurrency = 'TON' }) => {
  // Получаем данные пользователя и баланса из контекста
  const { 
    userId, 
    uniBalance, 
    tonBalance, 
    refreshBalance,
    walletAddress 
  } = useUser();
  
  // Базовые состояния формы и UI
  const [selectedCurrency, setSelectedCurrency] = useState<'UNI' | 'TON'>(initialCurrency);
  const [submitState, setSubmitState] = useState<SubmitState>(SubmitState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  
  // Состояния для анимаций и эффектов фокуса
  const [amountFocused, setAmountFocused] = useState(false);
  
  // Хук для отображения уведомлений
  const { success, error, info, loading } = useNotification();
  
  // Настройка формы с валидацией
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    reset,
    clearErrors
  } = useForm<DepositFormData>({
    resolver: zodResolver(depositFormSchema),
    defaultValues: {
      amount: 0.001,
      currency: selectedCurrency
    },
    mode: 'onChange'
  });
  
  // Следим за изменениями суммы
  const watchedAmount = watch('amount');
  
  // Минимальные суммы для пополнения
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
    
    info(`Переключено на ${currency}`, {
      duration: 2000
    });
  };
  
  // Основная функция обработки пополнения
  const onSubmit = async (data: DepositFormData) => {
    if (!userId) {
      setErrorMessage('Ошибка авторизации пользователя');
      return;
    }
    
    setSubmitState(SubmitState.SUBMITTING);
    setErrorMessage(null);
    setTransactionId(null);
    
    try {
      if (selectedCurrency === 'TON') {
        // Для TON - генерируем ссылку на перевод
        await handleTonDeposit(data.amount);
      } else {
        // Для UNI - вызываем API для создания депозита
        await handleUniDeposit(data.amount);
      }
      
      setSubmitState(SubmitState.SUCCESS);
      setTransactionId(`DEP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      
      // Обновляем баланс
      await refreshBalance();
      
      success(`Заявка на пополнение ${data.amount} ${selectedCurrency} создана`, {
        duration: 5000
      });
      
      // Сброс формы после успешного выполнения
      setTimeout(() => {
        reset();
        setSubmitState(SubmitState.IDLE);
        setTransactionId(null);
      }, 3000);
      
    } catch (error) {
      setSubmitState(SubmitState.ERROR);
      const errorMsg = error instanceof Error ? error.message : 'Произошла ошибка при пополнении';
      setErrorMessage(errorMsg);
      
      showNotification('error', {
        message: errorMsg,
        duration: 5000
      });
    }
  };
  
  // Обработка пополнения TON через кошелек
  const handleTonDeposit = async (amount: number) => {
    if (!walletAddress) {
      throw new Error('TON кошелек не подключен. Подключите кошелек в разделе "Кошелек"');
    }
    
    // Генерируем ссылку для TON Transfer
    const tonTransferUrl = `ton://transfer/${process.env.VITE_TON_DEPOSIT_WALLET || 'UQBlrUfJMIlAcyYzttyxV2xrrvaHHIKEKeetGZbDoitTRWT8'}?amount=${Math.floor(amount * 1000000000)}&text=DEPOSIT_${userId}_${Date.now()}`;
    
    // Открываем ссылку для перевода
    window.open(tonTransferUrl, '_blank');
    
    // Создаем запись о депозите в системе
    const response = await fetch('/api/v2/wallet/deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('unifarm_jwt_token') || ''}`
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'TON',
        type: 'ton_transfer',
        wallet_address: walletAddress
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Ошибка при создании депозита');
    }
  };
  
  // Обработка пополнения UNI (демо версия)
  const handleUniDeposit = async (amount: number) => {
    // Для демонстрации - имитируем успешное пополнение
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // В production версии здесь будет реальный API вызов
    console.log(`[DepositForm] Демо пополнение UNI: ${amount}`);
    
    // Имитируем успех
    return { success: true };
  };
  
  // Получаем текущий баланс для отображения
  const getCurrentBalance = () => {
    return selectedCurrency === 'UNI' ? uniBalance : tonBalance;
  };
  
  return (
    <Card className="mb-6 bg-gray-800 border-gray-700 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center">
          <i className="fas fa-plus-circle text-primary mr-3"></i>
          Пополнение кошелька
        </CardTitle>
        <CardDescription>
          Пополните ваш баланс UNI или TON для участия в фарминге и бустах
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Селектор валюты */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Выберите валюту для пополнения:
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
          
          {/* Информация о текущем балансе */}
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-600">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Текущий баланс {selectedCurrency}:</span>
              <span className="text-lg font-medium text-white">
                {getCurrentBalance().toFixed(selectedCurrency === 'TON' ? 6 : 2)} {selectedCurrency}
              </span>
            </div>
          </div>
          
          {/* Поле суммы */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Сумма для пополнения:
            </label>
            <div className="relative">
              <Input
                {...register('amount', { valueAsNumber: true })}
                type="number"
                step={selectedCurrency === 'TON' ? '0.001' : '1'}
                min={getMinAmount()}
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
              Минимум: {getMinAmount()} {selectedCurrency}
            </p>
          </div>
          
          {/* Инструкции для TON */}
          {selectedCurrency === 'TON' && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-blue-400 text-sm">
              <i className="fas fa-info-circle mr-2"></i>
              При выборе TON откроется ваш кошелек для перевода средств на адрес проекта
            </div>
          )}
          
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
            className={`w-full py-3 font-medium transition-all duration-200 ${
              selectedCurrency === 'TON'
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-primary hover:bg-primary/80 text-white'
            } ${
              (!isValid || submitState === SubmitState.SUBMITTING) 
                ? 'opacity-50 cursor-not-allowed' 
                : 'shadow-lg hover:shadow-xl'
            }`}
          >
            {submitState === SubmitState.SUBMITTING ? (
              <>
                <i className="fas fa-spinner animate-spin mr-2"></i>
                Обработка...
              </>
            ) : (
              <>
                <i className="fas fa-plus mr-2"></i>
                Пополнить {selectedCurrency}
              </>
            )}
          </Button>
          
        </form>
      </CardContent>
    </Card>
  );
};

export default DepositForm;