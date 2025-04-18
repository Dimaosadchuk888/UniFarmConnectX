import React, { useState, useEffect } from 'react';
import WalletConnectionCard from '@/components/wallet/WalletConnectionCard';
import WithdrawalForm from '@/components/wallet/WithdrawalForm';
import BalanceCard from '@/components/wallet/BalanceCard';
import TransactionHistory from '@/components/wallet/TransactionHistory';
import { 
  isWalletConnected, 
  getWalletAddress, 
  addConnectionListener, 
  removeConnectionListener 
} from '@/services/tonConnectService';
import { 
  linkWalletAddress, 
  isWalletAddressSent,
  resetWalletAddressSent 
} from '@/services/walletLinkService';

const Wallet: React.FC = () => {
  // Для сохранения совместимости с существующей структурой компонента
  // оставляем state, но используем его только для логов
  const [connected, setConnected] = useState(false);
  
  // Функция для проверки статуса подключения
  const checkConnectionStatus = () => {
    const connectionStatus = isWalletConnected();
    const address = getWalletAddress();
    
    console.log("[DEBUG] WalletPage - Connection check:", { 
      isConnected: connectionStatus, 
      walletAddress: address,
      time: new Date().toISOString()
    });
    
    setConnected(connectionStatus);
  };
  
  // Эффект для обработки подключения адреса кошелька
  useEffect(() => {
    // Проверка статуса подключения внутри эффекта
    const walletIsConnected = isWalletConnected();
    
    // Если кошелек подключен и адрес еще не был отправлен
    if (walletIsConnected && !isWalletAddressSent()) {
      console.log("[DEBUG] WalletPage - Sending wallet address to server");
      
      // Отправляем адрес кошелька на сервер
      linkWalletAddress()
        .then(result => {
          console.log("[DEBUG] WalletPage - Wallet address link result:", result);
        })
        .catch(error => {
          console.error("[DEBUG] WalletPage - Error linking wallet address:", error);
        });
    } else if (!walletIsConnected) {
      // Если кошелек отключился, сбрасываем флаг
      resetWalletAddressSent();
    }
  }, [connected]); // Зависимость от состояния connected, которое обновляется в checkConnectionStatus
  
  // Прямая проверка подключения кошелька для рендеринга компонентов
  const walletConnected = isWalletConnected();
  
  useEffect(() => {
    // Начальная проверка подключения
    console.log("[DEBUG] WalletPage - Component mounted");
    checkConnectionStatus();
    
    // Подписываемся на изменения статуса подключения для логирования
    addConnectionListener(checkConnectionStatus);
    
    // Отписываемся при размонтировании компонента
    return () => {
      console.log("[DEBUG] WalletPage - Component unmounted");
      removeConnectionListener(checkConnectionStatus);
    };
  }, []);
  
  // Добавляем лог для отладки
  console.log("[DEBUG] Wallet connected:", walletConnected);
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold text-white">Ваш TON-кошелёк</h1>
      </div>
      
      <BalanceCard />
      <WalletConnectionCard />
      
      {/* Вместо локального состояния используем прямой вызов isWalletConnected() */}
      {walletConnected && (
        <>
          <WithdrawalForm />
          <TransactionHistory />
        </>
      )}
      
      {!walletConnected && (
        <div className="rounded-lg bg-gray-800 border border-gray-700 p-6 mt-6 text-center">
          <div className="mb-4 text-gray-400">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="48" 
              height="48" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="mx-auto mb-3"
            >
              <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
              <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
              <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
            </svg>
            <p className="text-lg font-medium text-white mb-2">Кошелек не подключен</p>
            <p className="text-sm text-gray-400 mb-4">
              Для использования всех возможностей платформы, необходимо подключить TON-кошелек
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
