import React from 'react';
import WithdrawalForm from '@/components/wallet/WithdrawalForm';
import BalanceCard from '@/components/wallet/BalanceCard';
import TransactionHistory from '@/components/wallet/TransactionHistory';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

/**
 * Страница кошелька с информацией о балансе, формой вывода средств и историей транзакций
 */
const Wallet: React.FC = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold text-white">Ваш TON-кошелёк</h1>
      </div>
      
      {/* Отображаем карточку с балансом */}
      <ErrorBoundary fallback={<div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 my-4">Не удалось загрузить информацию о балансе</div>}>
        <BalanceCard />
      </ErrorBoundary>
      
      {/* Отображаем форму вывода и историю транзакций */}
      <ErrorBoundary fallback={<div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 my-4">Не удалось загрузить форму вывода средств</div>}>
        <WithdrawalForm />
      </ErrorBoundary>
      
      <ErrorBoundary fallback={<div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 my-4">Не удалось загрузить историю транзакций</div>}>
        <TransactionHistory />
      </ErrorBoundary>
    </div>
  );
};

export default Wallet;
