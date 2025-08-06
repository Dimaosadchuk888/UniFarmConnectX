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
  saveTonWalletAddress,
  getTonWalletAddress 
} from '@/services/tonConnectService';
import { formatAmount } from '@/utils/formatters';
import { Wallet, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DepositMonitor } from '@/services/depositMonitor';
import { depositRecoveryService } from '@/services/DepositRecoveryService';

/**
 * Компонент для пополнения баланса через TON Wallet
 */
const TonDepositCard: React.FC = () => {
  const { userId, tonBalance, refreshBalance } = useUser();
  const { toast } = useToast();
  const { success, error: showError, loading: showLoading } = useNotification();
  
  // Безопасная инициализация TonConnect UI с проверкой
  let tonConnectUI = null;
  try {
    const [tonConnectUIValue] = useTonConnectUI();
    tonConnectUI = tonConnectUIValue;
  } catch (error) {
    console.error('[TonDepositCard] Ошибка инициализации TonConnect UI:', error);
  }
  
  const [amount, setAmount] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [processedTxHashes, setProcessedTxHashes] = useState<Set<string>>(new Set()); // Защита от дублирования

  // Функция для повторной отправки неудачных депозитов
  const retryFailedDeposit = async (failedData: any) => {
    console.log('[TON_DEPOSIT] Attempting to retry failed deposit', failedData);
    
    try {
      const { apiRequest } = await import('@/lib/queryClient');
      const data = await apiRequest('/api/v2/wallet/ton-deposit', {
        method: 'POST',
        body: JSON.stringify({
          ton_tx_hash: failedData.txHash,
          amount: failedData.amount,
          wallet_address: failedData.walletAddress
        })
      });

      if (data?.success) {
        success(`Депозит ${failedData.amount} TON успешно восстановлен`);
        localStorage.removeItem('failed_ton_deposit');
        console.log('[TON_DEPOSIT] Failed deposit successfully recovered');
        refreshBalance(true);
      } else {
        console.error('[TON_DEPOSIT] Failed deposit retry unsuccessful', data?.error);
      }
    } catch (error) {
      console.error('[TON_DEPOSIT] Failed to retry deposit', error);
    }
  };

  // Слушаем события восстановления депозитов от DepositRecoveryService
  useEffect(() => {
    const handleDepositRecovered = (event: CustomEvent) => {
      const { amount } = event.detail;
      toast({
        title: "✅ Депозит восстановлен!",
        description: `${amount} TON успешно зачислен на ваш баланс`,
        duration: 5000,
      });
      refreshBalance(true); // Обновляем баланс
    };
    
    window.addEventListener('deposit-recovered', handleDepositRecovered as EventListener);
    
    return () => {
      window.removeEventListener('deposit-recovered', handleDepositRecovered as EventListener);
    };
  }, [toast, refreshBalance]);

  // Проверяем подключение кошелька при загрузке
  useEffect(() => {
    if (tonConnectUI) {
      const connected = isTonWalletConnected(tonConnectUI);
      setIsConnected(connected);
      
      if (connected && tonConnectUI.account?.address) {
        const getUserFriendlyAddress = async () => {
          const userFriendlyAddress = await getTonWalletAddress(tonConnectUI);
          if (userFriendlyAddress) {
            setWalletAddress(userFriendlyAddress);
            // Сохраняем адрес в БД
            await saveTonWalletAddress(userFriendlyAddress);
          }
        };
        getUserFriendlyAddress();
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
          const userFriendlyAddress = await getTonWalletAddress(tonConnectUI);
          if (userFriendlyAddress) {
            setWalletAddress(userFriendlyAddress);
            await saveTonWalletAddress(userFriendlyAddress);
            success('Кошелек успешно подключен');
          }
        }
      } else {
        showError('Не удалось подключить кошелек');
      }
    } catch (error) {
      console.error('Ошибка подключения кошелька:', error);
      showError('Не удалось подключить кошелек');
    } finally {
      setIsConnecting(false);
    }
  };

  // Обработчик отправки транзакции
  const handleDeposit = async () => {
    const depositAmount = parseFloat(amount);
    
    if (!depositAmount || depositAmount <= 0) {
      showError('Введите сумму больше 0');
      return;
    }

    if (!isConnected || !tonConnectUI) {
      showError('Сначала подключите кошелек');
      return;
    }

    // КРИТИЧЕСКАЯ ПРОВЕРКА: userId должен существовать
    if (!userId) {
      showError('Необходима авторизация. Обновите страницу.');
      console.error('[TON_DEPOSIT] CRITICAL: userId is undefined', { userId });
      return;
    }

    // Получаем актуальный адрес кошелька
    const currentWalletAddress = await getTonWalletAddress(tonConnectUI);
    if (!currentWalletAddress) {
      showError('Не удалось получить адрес кошелька');
      console.error('[TON_DEPOSIT] Failed to get wallet address');
      return;
    }

    console.log('[TON_DEPOSIT] Этап 1: Начало депозита', {
      userId,
      amount: depositAmount,
      walletAddress: currentWalletAddress
    });
    
    // Используем DepositMonitor для отслеживания
    DepositMonitor.logDeposit('TON_DEPOSIT_START', {
      userId,
      amount: depositAmount,
      walletAddress: currentWalletAddress
    });

    setIsProcessing(true);
    showLoading('Отправка транзакции...');

    try {
      // Отправляем транзакцию через TON Connect
      const result = await sendTonTransaction(
        tonConnectUI,
        depositAmount.toString(),
        'UniFarm Deposit'
      );

      console.log('[TON_DEPOSIT] Этап 2: Транзакция отправлена', {
        success: result?.status === 'success',
        hasHash: !!result?.txHash,
        hashLength: result?.txHash?.length
      });
      
      DepositMonitor.logDeposit('TON_DEPOSIT_TX_SENT', {
        success: result?.status === 'success',
        hasHash: !!result?.txHash
      });

      if (result && result.status === 'success' && result.txHash) {
        // Проверяем, не была ли эта транзакция уже обработана
        if (processedTxHashes.has(result.txHash)) {
          console.log('[TonDepositCard] Транзакция уже обработана:', result.txHash);
          showError('Эта транзакция уже была обработана');
          return;
        }

        // Добавляем хеш в список обработанных
        setProcessedTxHashes(prev => {
          const newSet = new Set(prev);
          newSet.add(result.txHash);
          return newSet;
        });

        console.log('[TON_DEPOSIT] Этап 3: Отправка на backend', {
          endpoint: '/api/v2/wallet/ton-deposit',
          userId,
          amount: depositAmount,
          walletAddress: currentWalletAddress,
          txHashPreview: result.txHash.substring(0, 20) + '...'
        });

        // Используем apiRequest для автоматической работы с JWT
        const { apiRequest } = await import('@/lib/queryClient');
        
        try {
          const data = await apiRequest('/api/v2/wallet/ton-deposit', {
            method: 'POST',
            body: JSON.stringify({
              ton_tx_hash: result.txHash,
              amount: depositAmount,  
              wallet_address: currentWalletAddress
            })
          });

          console.log('[TON_DEPOSIT] Этап 4: Ответ от backend', {
            success: data?.success,
            error: data?.error,
            transactionId: data?.transaction_id
          });
          
          if (data?.success) {
            success(`Депозит ${depositAmount} TON успешно обработан`);
            setAmount('');
            
            // Удаляем из failed deposits если был там
            localStorage.removeItem('failed_ton_deposit');
            
            console.log('[TON_DEPOSIT] ✅ Успешно завершен', {
              amount: depositAmount,
              transactionId: data.transaction_id
            });
            
            DepositMonitor.logDeposit('TON_DEPOSIT_SUCCESS', {
              amount: depositAmount,
              transactionId: data.transaction_id,
              userId
            });
            
            // Обновляем баланс
            setTimeout(() => {
              refreshBalance(true);
            }, 1000);
          } else {
            throw new Error(data?.error || 'Ошибка обработки депозита');
          }
        } catch (backendError: any) {
          console.error('[TON_DEPOSIT] ❌ CRITICAL ERROR: Backend call failed', {
            stage: 'backend_call',
            error: backendError?.message || backendError,
            userId,
            amount: depositAmount,
            txHash: result.txHash.substring(0, 20) + '...'
          });
          
          // Логируем критическую ошибку
          DepositMonitor.logDeposit('TON_DEPOSIT_ERROR', {
            stage: 'backend_call',
            error: backendError?.message || backendError,
            userId,
            amount: depositAmount
          });
          
          // Уведомляем о критической ошибке
          DepositMonitor.notifyAdminOnCriticalError({
            type: 'DEPOSIT_FAILURE',
            userId,
            amount: depositAmount,
            error: backendError?.message || 'Backend call failed'
          });
          
          // Сохраняем failed deposit для retry
          const failedDeposit = {
            txHash: result.txHash,
            amount: depositAmount,
            walletAddress: currentWalletAddress,
            timestamp: Date.now(),
            error: backendError?.message || 'Unknown error'
          };
          
          localStorage.setItem('failed_ton_deposit', JSON.stringify(failedDeposit));
          console.log('[TON_DEPOSIT] Saved failed deposit for retry', failedDeposit);
          
          showError(backendError?.message || 'Ошибка обработки депозита. Попробуйте обновить страницу.');
        }
      } else {
        showError('Транзакция отменена');
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