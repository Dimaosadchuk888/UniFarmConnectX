import React, { useState, useEffect } from 'react';
import BalanceCard from '@/components/wallet/BalanceCard';
import DepositForm from '@/components/wallet/DepositForm';
import WithdrawalForm from '@/components/wallet/WithdrawalForm';
import TransactionHistory from '@/components/wallet/TransactionHistory';
import { ErrorBoundary } from 'react-error-boundary';

/**
 * Компонент ошибки для ErrorBoundary
 */
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({ 
  error, 
  resetErrorBoundary 
}) => (
  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
    <i className="fas fa-exclamation-triangle text-red-400 text-2xl mb-2"></i>
    <p className="text-red-400 mb-2">Произошла ошибка при загрузке компонента</p>
    <p className="text-xs text-gray-400 mb-3">{error.message}</p>
    <button 
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
    >
      Попробовать снова
    </button>
  </div>
);

/**
 * Страница кошелька согласно UX спецификации
 * Включает карточку баланса, форму пополнения, форму вывода средств и историю транзакций
 */
const Wallet: React.FC = () => {
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'UNI' | 'TON'>('TON');

  // Обработчик событий открытия формы пополнения из BalanceCard
  useEffect(() => {
    const handleOpenDepositForm = (event: any) => {
      const currency = event.detail?.currency || 'TON';
      setSelectedCurrency(currency);
      setShowDepositForm(true);
    };

    window.addEventListener('openDepositForm', handleOpenDepositForm);
    return () => window.removeEventListener('openDepositForm', handleOpenDepositForm);
  }, []);

  return (
    <div className="space-y-4 pb-6">
      {/* Заголовок страницы */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <i className="fas fa-wallet text-primary mr-3"></i>
          Кошелек
        </h1>
        <div className="text-xs text-gray-400">
          Управление балансом и транзакциями
        </div>
      </div>
      
      {/* Карточка баланса с ErrorBoundary */}
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => window.location.reload()}
      >
        <BalanceCard />
      </ErrorBoundary>
      
      {/* Управление операциями - переключатель между Пополнением и Выводом */}
      <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-1 mb-4">
        <button
          onClick={() => setShowDepositForm(true)}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
            showDepositForm
              ? 'bg-primary text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          <i className="fas fa-plus mr-2"></i>
          Пополнение
        </button>
        <button
          onClick={() => setShowDepositForm(false)}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
            !showDepositForm
              ? 'bg-primary text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          <i className="fas fa-minus mr-2"></i>
          Вывод
        </button>
      </div>
      
      {/* Форма пополнения средств с ErrorBoundary */}
      {showDepositForm && (
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={() => window.location.reload()}
        >
          <DepositForm initialCurrency={selectedCurrency} />
        </ErrorBoundary>
      )}
      
      {/* Форма вывода средств с ErrorBoundary */}
      {!showDepositForm && (
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={() => window.location.reload()}
        >
          <WithdrawalForm />
        </ErrorBoundary>
      )}
      
      {/* История транзакций с ErrorBoundary */}
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => window.location.reload()}
      >
        <TransactionHistory />
      </ErrorBoundary>
    </div>
  );
};

export default Wallet;
