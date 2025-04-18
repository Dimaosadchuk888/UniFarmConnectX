import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Coins, Wallet, Loader2 } from 'lucide-react';
import PaymentMethodDialog from './PaymentMethodDialog';
import ExternalPaymentStatus from './ExternalPaymentStatus';
import { 
  sendTonTransaction, 
  createTonTransactionComment,
  isTonWalletConnected
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
    setSelectedBoostId(boostId);
    setPaymentMethodDialogOpen(true);
  };

  // Обработчик выбора способа оплаты
  const handleSelectPaymentMethod = async (boostId: number, paymentMethod: 'internal_balance' | 'external_wallet') => {
    setPaymentMethodDialogOpen(false);
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
          
          // Отправляем транзакцию через TonConnect SDK 
          const result = await sendTonTransaction(
            selectedBoost.priceTon, // Сумма в TON
            comment // Комментарий в формате "UniFarmBoost:userId:boostId"
          );
          
          if (result) {
            // Если транзакция успешно отправлена, создаем запись об ожидающей транзакции на сервере
            const response = await apiRequest('POST', '/api/ton-boosts/purchase', {
              user_id: userId,
              boost_id: boostId,
              payment_method: 'external_wallet',
              tx_hash: result.txHash // Добавляем хеш транзакции для отслеживания
            });
            
            if (!response.ok) {
              throw new Error("Failed to register transaction on server");
            }
            
            const data = await response.json();
            
            if (data.success) {
              // Устанавливаем данные для компонента ExternalPaymentStatus
              setExternalPaymentData({
                userId: userIdInt,
                transactionId: data.data.transactionId,
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
              toast({
                title: "Предупреждение",
                description: data.message || "Транзакция отправлена, но не удалось зарегистрировать платеж на сервере",
                variant: "default"
              });
            }
          } else {
            // Если транзакция не была отправлена (пользователь отменил или произошла ошибка)
            toast({
              title: "Транзакция отменена",
              description: "Транзакция не была выполнена или была отменена",
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
    const isConnected = isTonWalletConnected(); // Импортированная из tonConnectService.ts
    
    if (!isConnected) {
      toast({
        title: "Кошелек не подключен",
        description: "Пожалуйста, подключите TON-кошелёк, чтобы купить Boost-пакет.",
        variant: "destructive"
      });
      return false;
    }
    
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