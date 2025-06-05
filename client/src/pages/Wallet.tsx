import React from 'react';
import BalanceCard from '@/components/wallet/BalanceCard';
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
 * Включает карточку баланса, форму вывода средств и историю транзакций
 */
const Wallet: React.FC = () => {
  return (
    <div className="p-4 min-h-full">
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
      
      <div className="space-y-6">
        {/* Карточка баланса с ErrorBoundary */}
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={() => window.location.reload()}
        >
          <BalanceCard />
        </ErrorBoundary>
        
        {/* Форма вывода средств с ErrorBoundary */}
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={() => window.location.reload()}
        >
          <WithdrawalForm />
        </ErrorBoundary>
        
        {/* История транзакций с ErrorBoundary */}
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={() => window.location.reload()}
        >
          <TransactionHistory />
        </ErrorBoundary>
        
        {/* Дополнительное пространство внизу для прокрутки */}
        <div className="h-4"></div>
      </div>
    </div>
  );
};

export default Wallet;
