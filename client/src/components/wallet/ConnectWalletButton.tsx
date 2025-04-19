import React, { useEffect, useState } from 'react';
// Используем новую реализацию без Buffer
import { 
  connectTonWallet as connectWallet, 
  disconnectTonWallet as disconnectWallet, 
  getTonWalletAddress, 
  isTonWalletConnected
} from '@/services/simpleTonTransaction';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTonConnectUI } from '@tonconnect/ui-react';

interface ConnectWalletButtonProps {
  className?: string;
}

/**
 * Компонент кнопки для подключения TON кошелька
 * Используется совместно с TonConnectUI
 */
const ConnectWalletButton: React.FC<ConnectWalletButtonProps> = ({ className }) => {
  const [tonConnectUI] = useTonConnectUI();
  const [loading, setLoading] = useState(false);
  
  // Получаем состояние подключения и адрес из tonConnectUI
  const connected = tonConnectUI.connected;
  const address = connected && tonConnectUI.account ? tonConnectUI.account.address : null;
  
  // Используем debugLog для логирования процесса подключения
  console.log('[DEBUG] ConnectWalletButton render:', {
    tonConnectUIExists: !!tonConnectUI,
    connected: connected,
    address: address
  });
  
  // Обработчик подключения/отключения кошелька
  const handleWalletConnection = async () => {
    if (!tonConnectUI) {
      console.error('tonConnectUI is not initialized');
      return;
    }
    
    setLoading(true);
    try {
      console.log('[DEBUG] handleWalletConnection:', { 
        connected: connected, 
        tonConnectUI: true,
        connectFn: typeof tonConnectUI.connectWallet === 'function' ? 'available' : 'missing',
        disconnectFn: typeof tonConnectUI.disconnect === 'function' ? 'available' : 'missing'
      });
      
      if (connected) {
        console.log('[DEBUG] Вызов disconnect...');
        await disconnectWallet(tonConnectUI);
      } else {
        console.log('[DEBUG] Вызов connectWallet...');
        await connectWallet(tonConnectUI);
      }
    } catch (error: any) {
      console.error('Wallet connection error:', error?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Копирование адреса в буфер обмена
  const copyAddressToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (address) {
      navigator.clipboard.writeText(address)
        .then(() => {
          console.log('Address copied to clipboard');
        })
        .catch((error) => {
          console.error('Failed to copy address:', error);
        });
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              onClick={handleWalletConnection}
              className={`relative px-3 py-2 ${connected ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300' : 'bg-blue-600 hover:bg-blue-700 text-white'} ${className}`}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Подключение...
                </span>
              ) : connected && address ? (
                <div className="flex items-center space-x-1" onClick={copyAddressToClipboard}>
                  <span className="text-sm font-medium truncate max-w-[280px]">
                    {address}
                  </span>
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
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
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
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                    <line x1="12" y1="16" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                  <span>Connect Wallet</span>
                </div>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {connected && address 
              ? 'Нажмите, чтобы скопировать TON-адрес' 
              : 'Подключите TON-кошелек через Tonkeeper или другой совместимый кошелек'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
};

export default ConnectWalletButton;