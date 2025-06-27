/**
 * Blockchain Page
 * Страница для расширенного взаимодействия с TON блокчейном
 */

import React from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import TonBlockchainDashboard from '@/components/blockchain/TonBlockchainDashboard';
import { useUser } from '@/contexts/userContext';

const Blockchain: React.FC = () => {
  const [tonConnectUI] = useTonConnectUI();
  const { user } = useUser();

  // Получаем адрес подключенного кошелька
  const walletAddress = tonConnectUI?.wallet?.account?.address;

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Заголовок страницы */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">TON Blockchain</h1>
          <p className="text-gray-400 text-lg">
            Полная интеграция с экосистемой TON blockchain
          </p>
        </div>

        {/* Основной дашборд */}
        <TonBlockchainDashboard 
          walletAddress={walletAddress}
          showNetworkStats={true}
        />
      </div>
    </div>
  );
};

export default Blockchain;