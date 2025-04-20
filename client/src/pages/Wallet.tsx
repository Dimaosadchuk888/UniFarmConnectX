import React from 'react';
import WithdrawalForm from '@/components/wallet/WithdrawalForm';
import BalanceCard from '@/components/wallet/BalanceCard';
import TransactionHistory from '@/components/wallet/TransactionHistory';

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
      <BalanceCard />
      
      {/* Отображаем форму вывода и историю транзакций */}
      <WithdrawalForm />
      <TransactionHistory />
    </div>
  );
};

export default Wallet;
