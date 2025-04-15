import React from 'react';
import WalletConnectionCard from '@/components/wallet/WalletConnectionCard';
import WithdrawalForm from '@/components/wallet/WithdrawalForm';

const Wallet: React.FC = () => {
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-4">Ваш TON-кошелёк</h1>
      <WalletConnectionCard />
      <WithdrawalForm />
    </div>
  );
};

export default Wallet;
