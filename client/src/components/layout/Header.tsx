import React, { useEffect, useState } from 'react';
import ConnectWalletButton from '../wallet/ConnectWalletButton';
import { 
  isWalletConnected, 
  getWalletAddress, 
  shortenAddress,
  disconnectWallet,
  addConnectionListener,
  removeConnectionListener
} from '@/services/tonConnectService';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const Header: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const { toast } = useToast();

  // Обработчик для обновления статуса подключения кошелька
  useEffect(() => {
    // Функция для проверки статуса подключения
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
    
    // Проверяем статус при загрузке
    checkWalletConnection();
    
    // Подписываемся на централизованные обновления статуса подключения
    addConnectionListener(checkWalletConnection);
    
    // Отписываемся при размонтировании компонента
    return () => {
      removeConnectionListener(checkWalletConnection);
    };
  }, []);

  // Копирование адреса в буфер обмена
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

  // Отключение кошелька
  const handleDisconnect = async () => {
    await disconnectWallet();
    toast({
      title: "Кошелек отключен",
      description: "TON-кошелек успешно отключен",
      duration: 2000,
    });
  };

  return (
    <header className="fixed top-0 right-0 p-2 z-50">
      <div className="flex justify-end">
        {connected && address ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2 bg-opacity-80 shadow-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium">{shortenAddress(address)}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={copyAddressToClipboard}>
                <div className="flex items-center space-x-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-600 flex-shrink-0"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>Копировать адрес</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDisconnect}>
                <div className="flex items-center space-x-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-600 flex-shrink-0"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Отключить кошелек</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <ConnectWalletButton className="shadow-lg" />
        )}
      </div>
    </header>
  );
};

export default Header;