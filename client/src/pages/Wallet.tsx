import React from 'react';
import WalletConnectionCard from '@/components/wallet/WalletConnectionCard';
import WithdrawalForm from '@/components/wallet/WithdrawalForm';
import BalanceCard from '@/components/wallet/BalanceCard';
import TransactionHistory from '@/components/wallet/TransactionHistory';

const Wallet: React.FC = () => {
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-4">Ваш TON-кошелёк</h1>
      <BalanceCard />
      <TransactionHistory />
      <WalletConnectionCard />
      <WithdrawalForm />
    </div>
  );
};

export default Wallet;
