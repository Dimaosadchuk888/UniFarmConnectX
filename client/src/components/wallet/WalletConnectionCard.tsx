import React, { useEffect, useState } from 'react';
import ConnectWalletButton from './ConnectWalletButton';
import { getWalletAddress, isWalletConnected } from '@/services/tonConnectService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const WalletConnectionCard: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Проверяем статус подключения при загрузке компонента
  useEffect(() => {
    const checkWalletConnection = () => {
      const isConnected = isWalletConnected();
      setConnected(isConnected);
      
      if (isConnected) {
        const walletAddress = getWalletAddress();
        setAddress(walletAddress);
      } else {
        setAddress(null);
      }
    };
    
    // Проверяем изначальное состояние
    checkWalletConnection();
    
    // Устанавливаем интервал для периодической проверки состояния
    const intervalId = setInterval(checkWalletConnection, 2000);
    
    // Очищаем интервал при размонтировании компонента
    return () => {
      clearInterval(intervalId);
    };
  }, []);
  
  // Обработчик клика для копирования адреса
  const copyAddressToClipboard = () => {
    if (address) {
      navigator.clipboard.writeText(address)
        .then(() => {
          toast({
            title: "Адрес скопирован",
            description: "TON-адрес скопирован в буфер обмена",
            duration: 2000,
          });
        })
        .catch((error) => {
          console.error('Ошибка при копировании адреса:', error);
          toast({
            title: "Ошибка",
            description: "Не удалось скопировать адрес",
            variant: "destructive",
            duration: 2000,
          });
        });
    }
  };
  
  return (
    <Card className="mb-6 bg-gray-800 border-gray-700 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-white">Подключение кошелька</CardTitle>
          {connected && (
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-green-500 text-xs font-medium">Подключено</span>
            </div>
          )}
        </div>
        <CardDescription>
          {connected 
            ? 'Ваш TON-кошелек подключен и готов к использованию'
            : 'Подключите ваш TON-кошелек для отправки и получения TON'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="w-full">
            {connected && address ? (
              <div className="text-sm text-gray-300 w-full">
                <p className="mb-1">Адрес вашего кошелька:</p>
                <div 
                  onClick={copyAddressToClipboard}
                  className="flex items-center space-x-2 bg-gray-700 px-3 py-1.5 rounded-md cursor-pointer hover:bg-gray-600 transition-colors overflow-auto"
                >
                  <span className="text-sm font-mono text-blue-300 whitespace-nowrap overflow-x-auto">{address}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-400 flex-shrink-0"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                Чтобы начать пользоваться TON-фармингом, необходимо подключить кошелек
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            <ConnectWalletButton />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WalletConnectionCard;