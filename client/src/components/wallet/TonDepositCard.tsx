import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@/contexts/userContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { 
  isTonWalletConnected, 
  connectTonWallet,
  sendTonTransaction,
  saveTonWalletAddress 
} from '@/services/tonConnectService';
import { formatAmount } from '@/utils/formatters';
import { Wallet, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Компонент для пополнения баланса через TON Wallet
 */
const TonDepositCard: React.FC = () => {
  const { userId, tonBalance, refreshBalance } = useUser();
  const { toast } = useToast();
  const { success, error: showError, loading: showLoading } = useNotification();
  const [tonConnectUI] = useTonConnectUI();
  
  const [amount, setAmount] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Проверяем подключение кошелька при загрузке
  useEffect(() => {
    if (tonConnectUI) {
      const connected = isTonWalletConnected(tonConnectUI);
      setIsConnected(connected);
      
      if (connected && tonConnectUI.account?.address) {
        const address = tonConnectUI.account.address;
        setWalletAddress(address);
        // Сохраняем адрес в БД
        saveTonWalletAddress(address);
      }
    }
  }, [tonConnectUI]);

  // Обработчик подключения кошелька
  const handleConnectWallet = async () => {
    if (!tonConnectUI) {
      showError('TON Connect не инициализирован');
      return;
    }

    setIsConnecting(true);
    try {
      const connected = await connectTonWallet(tonConnectUI);
      if (connected) {
        setIsConnected(true);
        if (tonConnectUI.account?.address) {
          const address = tonConnectUI.account.address;
          setWalletAddress(address);
          await saveTonWalletAddress(address);
          success('Кошелек успешно подключен');
        }
      } else {
        showError('Не удалось подключить кошелек');
      }
    } catch (error) {
      console.error('Ошибка подключения кошелька:', error);
      showError('Ошибка при подключении кошелька');
    } finally {
      setIsConnecting(false);
    }
  };

  // Обработчик отправки транзакции
  const handleDeposit = async () => {
    const depositAmount = parseFloat(amount);
    
    if (!depositAmount || depositAmount <= 0) {
      showError('Введите корректную сумму');
      return;
    }

    if (!isConnected || !tonConnectUI) {
      showError('Сначала подключите кошелек');
      return;
    }

    setIsProcessing(true);
    showLoading('Отправка транзакции...');

    try {
      // Адрес кошелька UniFarm для приема депозитов
      const UNIFARM_WALLET_ADDRESS = process.env.VITE_TON_DEPOSIT_ADDRESS || 'EQBvI0aFLnw2QbZgjMPCLRdtRHxhUyinQudg6sdiohIwg5jL';
      
      // Отправляем транзакцию через TON Connect
      const result = await sendTonTransaction(
        tonConnectUI,
        UNIFARM_WALLET_ADDRESS,
        depositAmount.toString(),
        'UniFarm Deposit'
      );

      if (result.success && result.transactionHash) {
        // Отправляем информацию о транзакции на backend
        const response = await fetch('/api/v2/wallet/ton-deposit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('unifarm_jwt_token')}`
          },
          body: JSON.stringify({
            user_id: userId,
            ton_tx_hash: result.transactionHash,
            amount: depositAmount,
            wallet_address: walletAddress
          })
        });

        const data = await response.json();
        
        if (data.success) {
          success(`Депозит ${depositAmount} TON успешно обработан`);
          setAmount('');
          // Обновляем баланс
          setTimeout(() => {
            refreshBalance(true);
          }, 1000);
        } else {
          showError(data.error || 'Ошибка обработки депозита');
        }
      } else {
        showError(result.error || 'Транзакция отменена');
      }
    } catch (error) {
      console.error('Ошибка при депозите:', error);
      showError('Ошибка при отправке транзакции');
    } finally {
      setIsProcessing(false);
    }
  };

  // Форматирование адреса кошелька
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-500/30">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-white flex items-center">
          <Wallet className="w-5 h-5 mr-2 text-blue-400" />
          Пополнение через TON Wallet
        </CardTitle>
        <CardDescription className="text-gray-400">
          Пополните баланс, отправив TON с вашего кошелька
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Статус подключения */}
        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-300">Кошелек подключен</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-gray-300">Кошелек не подключен</span>
                </>
              )}
            </div>
            
            {isConnected && walletAddress && (
              <span className="text-xs text-gray-500">
                {formatAddress(walletAddress)}
              </span>
            )}
          </div>
        </div>

        {!isConnected ? (
          // Кнопка подключения кошелька
          <Button
            onClick={handleConnectWallet}
            disabled={isConnecting}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Подключение...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 mr-2" />
                Подключить TON Wallet
              </>
            )}
          </Button>
        ) : (
          // Форма пополнения
          <>
            <div className="space-y-2">
              <Label htmlFor="deposit-amount" className="text-sm text-gray-300">
                Сумма пополнения (TON)
              </Label>
              <div className="relative">
                <Input
                  id="deposit-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Введите сумму"
                  min="0.1"
                  step="0.1"
                  disabled={isProcessing}
                  className="bg-black/30 border-gray-700 text-white pr-20"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAmount(tonBalance.toString())}
                  className="absolute right-1 top-1 h-7 px-2 text-xs text-gray-400 hover:text-white"
                  disabled={isProcessing}
                >
                  Max
                </Button>
              </div>
              
              {/* Информация о минимальной сумме */}
              <p className="text-xs text-gray-500">
                Минимальная сумма: 0.1 TON
              </p>
            </div>

            {/* Кнопка отправки */}
            <Button
              onClick={handleDeposit}
              disabled={isProcessing || !amount || parseFloat(amount) < 0.1}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Обработка...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Пополнить {amount ? `${amount} TON` : ''}
                </>
              )}
            </Button>
          </>
        )}

        {/* Информационное сообщение */}
        <div className="bg-blue-500/10 rounded-lg p-3">
          <p className="text-xs text-blue-300">
            <AlertCircle className="w-3 h-3 inline mr-1" />
            После подтверждения транзакции средства будут зачислены на ваш баланс в течение нескольких минут
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TonDepositCard;