import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Coins, Wallet, Loader2 } from 'lucide-react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import PaymentMethodDialog from './PaymentMethodDialog';
import ExternalPaymentStatus from './ExternalPaymentStatus';
import { 
  sendTonTransaction, 
  createTonTransactionComment,
  isTonWalletConnected,
  isTonPaymentReady
} from '../../services/tonConnectService';
import { getUserIdFromURL } from '@/lib/utils';

// Класс ошибки для неподключенного кошелька
class WalletNotConnectedError extends Error {
  constructor(message: string = 'Wallet not connected') {
    super(message);
    this.name = 'WalletNotConnectedError';
  }
}

// Типы данных для TON Boost-пакетов
interface TonBoostPackage {
  id: number;
  name: string;
  priceTon: string;
  bonusUni: string;
  rateTon: string;
  rateUni: string;
}

interface ExternalPaymentDataType {
  userId: number;
  transactionId: number;
  paymentLink: string;
  boostName: string;
}

const BoostPackagesCard: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tonConnectUI] = useTonConnectUI();
  const [selectedBoostId, setSelectedBoostId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [paymentMethodDialogOpen, setPaymentMethodDialogOpen] = useState<boolean>(false);
  const [externalPaymentDialogOpen, setExternalPaymentDialogOpen] = useState<boolean>(false);
  const [externalPaymentData, setExternalPaymentData] = useState<ExternalPaymentDataType | null>(null);

  // Получаем список доступных TON Boost-пакетов
  const { data, isLoading: isLoadingPackages } = useQuery({
    queryKey: ['/api/ton-boosts'],
    queryFn: async () => {
      const response = await fetch('/api/ton-boosts');
      const data = await response.json();
      return data.success ? data.data as TonBoostPackage[] : [];
    }
  });

  const boostPackages = data || [];

  // Обработчик клика по буст-пакету
  const handleBoostClick = (boostId: number) => {
    console.log('[DEBUG] Нажата кнопка покупки TON Boost:', {
      boostId,
      tonConnectUI: !!tonConnectUI,
      tonConnectUIWallet: tonConnectUI?.wallet,
      isConnected: isTonWalletConnected(tonConnectUI)
    });
    
    // Проверяем статус подключения кошелька и отображаем соответствующее действие
    const walletConnected = isTonWalletConnected(tonConnectUI);
    
    // Сохраняем ID буста в любом случае
    setSelectedBoostId(boostId);
    
    if (!walletConnected) {
      // Если кошелек не подключен, показываем уведомление вместо диалога
      toast({
        title: "Подключите TON-кошелёк",
        description: "Для покупки TON Boost-пакета необходимо подключить TON-кошелёк",
        variant: "default",
        action: (
          <Button 
            variant="default" 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => {
              if (tonConnectUI && typeof tonConnectUI.connectWallet === 'function') {
                tonConnectUI.connectWallet();
              }
            }}
          >
            Подключить
          </Button>
        )
      });
    } else {
      // Если кошелек подключен, показываем диалог выбора способа оплаты
      setPaymentMethodDialogOpen(true);
    }
  };

  // Обработчик выбора способа оплаты
  const handleSelectPaymentMethod = async (boostId: number, paymentMethod: 'internal_balance' | 'external_wallet') => {
    console.log('[DEBUG] Выбран способ оплаты:', {
      boostId,
      paymentMethod,
      tonConnectAvailable: !!tonConnectUI,
      tonConnectUIWallet: tonConnectUI?.wallet,
      connected: isTonWalletConnected(tonConnectUI)
    });
    
    // ВАЖНО: Сначала закрываем диалог выбора метода оплаты
    // Это позволит пользователю увидеть Tonkeeper без перекрытия нашим UI
    setPaymentMethodDialogOpen(false);
    
    // Только после закрытия диалога включаем лоадер
    setIsLoading(true);
    
    try {
      // Получаем ID пользователя из URL
      const userId = getUserIdFromURL();
      
      if (!userId) {
        console.error("No userId found in URL");
        toast({
          title: "Ошибка",
          description: "Не удалось определить ID пользователя",
          variant: "destructive"
        });
        return;
      }

      // Находим выбранный буст-пакет
      const selectedBoost = boostPackages.find(p => p.id === boostId);
      if (!selectedBoost) {
        throw new Error("Boost package not found");
      }

      // Если выбрана оплата через внешний кошелек, проверяем подключен ли TonConnect
      if (paymentMethod === 'external_wallet') {
        try {
          const userIdInt = parseInt(userId);
          const comment = createTonTransactionComment(userIdInt, boostId);
          
          console.log('[DEBUG] Начинаем процесс оплаты через внешний кошелек', {
            tonConnectUI: !!tonConnectUI,
            boostId,
            userId: userIdInt,
            priceTon: selectedBoost.priceTon,
            comment
          });
          
          console.log("==========================================================");
          console.log("[DEBUG] Executing sendTransaction for Boost", {
            connected: tonConnectUI?.connected,
            wallet: tonConnectUI?.wallet,
            ready: tonConnectUI ? isTonPaymentReady(tonConnectUI) : false,
          });
          console.log("==========================================================");
          
          // Выполняем комплексную проверку готовности к транзакции
          if (!checkWalletConnection()) {
            console.log("[DEBUG] CRITICAL! checkWalletConnection() вернул false");
            setIsLoading(false);
            return;
          }
          
          // Еще одна проверка - дополнительный лог
          console.log("[DEBUG] !!! ПРОШЛИ checkWalletConnection !!!");
          
          // Проверяем наличие функции sendTransaction (дополнительная проверка)
          if (!tonConnectUI || typeof tonConnectUI.sendTransaction !== 'function') {
            console.error('[ERROR] tonConnectUI.sendTransaction is not a function');
            console.log("[DEBUG] CRITICAL! tonConnectUI.sendTransaction is not a function");
            toast({
              title: "Ошибка TonConnect",
              description: "Ваш кошелек не поддерживает отправку транзакций через TonConnect",
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }
          
          // ВАЖНО: Сначала отправляем транзакцию через TonConnect SDK
          // Это откроет Tonkeeper автоматически и пользователь сможет подтвердить транзакцию
          console.log('[DEBUG] Вызываем sendTonTransaction...');
          const result = await sendTonTransaction(
            tonConnectUI, // используем tonConnectUI из хука
            selectedBoost.priceTon, // Сумма в TON
            comment // Комментарий в формате "UniFarmBoost:userId:boostId"
          );
          
          console.log('[DEBUG] Результат sendTonTransaction:', result);
          
          if (result) {
            console.log('[DEBUG] Транзакция успешно отправлена, регистрируем на сервере...');
            // Если пользователь подтвердил транзакцию в Tonkeeper, регистрируем её на сервере
            const registerResponse = await apiRequest('POST', '/api/ton-boosts/purchase', {
              user_id: userId,
              boost_id: boostId,
              payment_method: 'external_wallet',
              tx_hash: result.txHash // Передаем хеш транзакции
            });
            
            if (!registerResponse.ok) {
              console.error('[ERROR] Failed to register transaction on server', registerResponse);
              throw new Error("Failed to register transaction on server");
            }
            
            const registerData = await registerResponse.json();
            console.log('[DEBUG] registerData:', registerData);
            
            if (!registerData.success) {
              console.error('[ERROR] Server returned error:', registerData);
              throw new Error(registerData.message || "Failed to register transaction");
            }
            
            const transactionId = registerData.data.transactionId;
            
            // Теперь отправляем запрос на подтверждение платежа
            // Это нужно, чтобы система знала, что транзакция подтверждена пользователем
            await apiRequest('POST', '/api/ton-boosts/confirm-payment', {
              user_id: userIdInt,
              transaction_id: transactionId
            });
            
            // Теперь показываем диалог ожидания только ПОСЛЕ того, как пользователь подтвердил транзакцию
            setExternalPaymentData({
              userId: userIdInt,
              transactionId: transactionId,
              paymentLink: '', // Не нужна, так как используем TonConnect
              boostName: selectedBoost.name || 'TON Boost'
            });
            setExternalPaymentDialogOpen(true);
            
            // Обновляем кэш запросов
            await queryClient.invalidateQueries({ queryKey: ['/api/ton-farming/info'] });
            await queryClient.invalidateQueries({ queryKey: ['/api/ton-boosts/active'] });
            await queryClient.invalidateQueries({ queryKey: ['/api/transactions/user'] });
            await queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
          } else {
            // Если пользователь отменил транзакцию в Tonkeeper, просто показываем уведомление
            toast({
              title: "Транзакция отменена",
              description: "Транзакция не была выполнена или была отменена в кошельке",
              variant: "default"
            });
          }
        } catch (error) {
          console.error("Error sending TON transaction:", error);
          
          // Если ошибка связана с неподключенным кошельком, показываем сообщение
          if (error instanceof WalletNotConnectedError) {
            toast({
              title: "Кошелек не подключен",
              description: "Пожалуйста, подключите TON-кошелёк, чтобы купить Boost-пакет.",
              variant: "destructive"
            });
          } else {
            // В случае других ошибок также показываем уведомление
            toast({
              title: "Ошибка платежа",
              description: "Произошла ошибка при отправке платежа. Пожалуйста, подключите TON-кошелёк и попробуйте снова.",
              variant: "destructive"
            });
          }
        }
      } else {
        // Для внутреннего баланса - стандартный процесс
        const response = await apiRequest('POST', '/api/ton-boosts/purchase', {
          user_id: userId,
          boost_id: boostId,
          payment_method: paymentMethod
        });
        
        if (!response.ok) {
          throw new Error("Failed to purchase boost package");
        }
        
        const data = await response.json();
        
        if (data.success) {
          toast({
            title: "Успех!",
            description: data.message || "Буст-пакет успешно активирован!",
          });
          
          // Обновляем кэш запросов чтобы обновить баланс и другие данные
          await queryClient.invalidateQueries({ queryKey: ['/api/ton-farming/info'] });
          await queryClient.invalidateQueries({ queryKey: ['/api/ton-boosts/active'] });
          await queryClient.invalidateQueries({ queryKey: ['/api/transactions/user'] });
          await queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
        } else {
          toast({
            title: "Ошибка",
            description: data.message || "Не удалось активировать буст-пакет",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error("Error purchasing boost package:", error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при покупке буст-пакета",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Функция для проверки подключения TON-кошелька и показа уведомления, если не подключен
  const checkWalletConnection = (): boolean => {
    console.log('[WALLET_DEBUG] Проверка подключения кошелька. Начало проверки');
    
    // Проверяем наличие tonConnectUI
    if (!tonConnectUI) {
      console.error('[ERROR] tonConnectUI not initialized');
      console.log('[WALLET_DEBUG] tonConnectUI отсутствует');
      toast({
        title: "Ошибка инициализации",
        description: "Произошла ошибка инициализации TonConnect. Пожалуйста, обновите страницу и попробуйте снова.",
        variant: "destructive"
      });
      return false;
    }
    
    // Более детальное логирование состояния кошелька
    console.log('[WALLET_DEBUG] Статус tonConnectUI:', {
      connected: tonConnectUI.connected,
      hasWallet: !!tonConnectUI.wallet,
      walletDevice: tonConnectUI.wallet?.device?.appName || 'unknown',
      hasAccount: !!tonConnectUI.account,
      accountAddress: tonConnectUI.account?.address 
        ? (tonConnectUI.account.address.substring(0, 10) + '...') 
        : 'no-address',
      hasSendTransaction: typeof tonConnectUI.sendTransaction === 'function',
    });
    
    // Используем более строгую проверку, которая проверяет не только подключение, но и готовность к транзакциям
    const isReady = isTonPaymentReady(tonConnectUI);
    console.log('[WALLET_DEBUG] Результат проверки isTonPaymentReady:', isReady);
    
    if (!isReady) {
      const isConnected = isTonWalletConnected(tonConnectUI);
      console.log('[WALLET_DEBUG] Результат проверки isTonWalletConnected:', isConnected);
      
      if (isConnected) {
        // Подключен, но не готов к транзакциям
        console.error('[ERROR] Wallet connected but not ready for transactions');
        console.log('[WALLET_DEBUG] Кошелек подключен, но не готов к транзакциям. Детали:', {
          hasWallet: !!tonConnectUI.wallet,
          hasAccount: !!tonConnectUI.account,
          accountChain: tonConnectUI.account?.chain,
          hasSendTransaction: typeof tonConnectUI.sendTransaction === 'function',
        });
        
        // Пытаемся автоматически переподключить кошелек
        console.log('[WALLET_DEBUG] Попытка автоматического переподключения кошелька...');
        // Делаем таймаут, чтобы пользователь увидел сообщение
        setTimeout(() => {
          // Отключаем кошелек
          if (tonConnectUI && typeof tonConnectUI.disconnect === 'function') {
            console.log('[WALLET_DEBUG] Отключаем текущий кошелек');
            tonConnectUI.disconnect().then(() => {
              console.log('[WALLET_DEBUG] Кошелек отключен, пробуем подключить заново');
              // Выводим сообщение о переподключении
              toast({
                title: "Пробуем переподключить кошелек",
                description: "Пожалуйста, подтвердите подключение в открывшемся окне Tonkeeper",
                variant: "default"
              });
              
              // Подключаем снова через 1 секунду
              setTimeout(() => {
                if (tonConnectUI && typeof tonConnectUI.connectWallet === 'function') {
                  console.log('[WALLET_DEBUG] Вызываем connectWallet()');
                  tonConnectUI.connectWallet();
                }
              }, 1000);
            });
          }
        }, 2000);
        
        // Показываем уведомление
        toast({
          title: "Ошибка кошелька",
          description: "Ваш кошелек подключен, но не готов для отправки TON. Попробуйте переподключить кошелек.",
          variant: "destructive"
        });
      } else {
        // Просто не подключен
        console.error('[ERROR] Wallet not connected');
        console.log('[WALLET_DEBUG] Кошелек не подключен');
        toast({
          title: "Кошелек не подключен",
          description: "Пожалуйста, подключите TON-кошелёк, чтобы купить Boost-пакет.",
          variant: "destructive",
          action: (
            <Button 
              variant="default" 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                console.log('[WALLET_DEBUG] Нажата кнопка "Подключить"');
                if (tonConnectUI && typeof tonConnectUI.connectWallet === 'function') {
                  console.log('[WALLET_DEBUG] Вызываем connectWallet() из уведомления');
                  tonConnectUI.connectWallet();
                } else {
                  console.log('[WALLET_DEBUG] connectWallet не является функцией');
                }
              }}
            >
              Подключить
            </Button>
          )
        });
      }
      return false;
    }
    
    console.log('[WALLET_DEBUG] Проверка подключения успешна, кошелек готов к платежам');
    return true;
  };

  // Обработчик завершения внешнего платежа
  const handleExternalPaymentComplete = async () => {
    setExternalPaymentDialogOpen(false);
    
    // Обновляем данные после успешного платежа
    await queryClient.invalidateQueries({ queryKey: ['/api/ton-farming/info'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/ton-boosts/active'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/transactions/user'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
    
    toast({
      title: "Успех!",
      description: "TON Boost успешно активирован!",
    });
  };

  return (
    <>
      <Card className="w-full shadow-md border-blue-800/30 bg-gradient-to-br from-blue-950/40 to-blue-900/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl text-blue-400">TON Boost-пакеты</CardTitle>
          <CardDescription className="text-blue-300/80">
            Активируйте TON Boost для ускорения фарминга и получения бонусов
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPackages ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boostPackages.map((boost) => (
                <div 
                  key={boost.id}
                  className="bg-blue-900/20 rounded-lg border border-blue-700/30 p-4 hover:bg-blue-800/20 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-medium text-blue-300">{boost.name}</h3>
                    <span className="text-blue-300 font-bold">{boost.priceTon} TON</span>
                  </div>
                  <Separator className="bg-blue-700/30 my-2" />
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-blue-400/80">Бонус UNI:</span>
                      <span className="text-purple-300">+{boost.bonusUni} UNI</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-400/80">Доходность TON:</span>
                      <span className="text-blue-300">{boost.rateTon}% / день</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-400/80">Доходность UNI:</span>
                      <span className="text-purple-300">{boost.rateUni}% / день</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleBoostClick(boost.id)}
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isLoading && selectedBoostId === boost.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Активация...
                      </>
                    ) : (
                      'Активировать'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалог выбора способа оплаты */}
      <PaymentMethodDialog
        open={paymentMethodDialogOpen}
        onOpenChange={setPaymentMethodDialogOpen}
        boostId={selectedBoostId}
        boostName={selectedBoostId ? boostPackages.find(p => p.id === selectedBoostId)?.name || 'TON Boost' : ''}
        onSelectPaymentMethod={handleSelectPaymentMethod}
      />

      {/* Диалог статуса внешнего платежа */}
      {externalPaymentData && (
        <ExternalPaymentStatus
          open={externalPaymentDialogOpen}
          onOpenChange={setExternalPaymentDialogOpen}
          userId={externalPaymentData.userId}
          transactionId={externalPaymentData.transactionId}
          paymentLink={externalPaymentData.paymentLink}
          boostName={externalPaymentData.boostName}
          onPaymentComplete={handleExternalPaymentComplete}
        />
      )}
    </>
  );
};

export default BoostPackagesCard;