import React, { useState } from 'react';
import { useUser } from '@/contexts/userContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Coins, Wallet, Loader2, Zap, RefreshCcw } from 'lucide-react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import PaymentMethodDialog from './PaymentMethodDialog';
import ExternalPaymentStatus from './ExternalPaymentStatus';
import { 
  sendTonTransaction, 
  createTonTransactionComment,
  isTonWalletConnected,
  isTonPaymentReady
} from '@/services/tonConnectService';
import { formatNumberWithPrecision, getUserIdFromURL } from '@/lib/utils';

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
  priceTon: number;
  bonusUni: number;
  rateTon: number;
  rateUni: number;
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
  const { userId, username, refreshBalance } = useUser();
  const [selectedBoostId, setSelectedBoostId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [paymentMethodDialogOpen, setPaymentMethodDialogOpen] = useState<boolean>(false);
  const [externalPaymentDialogOpen, setExternalPaymentDialogOpen] = useState<boolean>(false);
  const [externalPaymentData, setExternalPaymentData] = useState<ExternalPaymentDataType | null>(null);

  // Получаем список доступных TON Boost-пакетов
  const { data, isLoading: isLoadingPackages } = useQuery({
    queryKey: ['/api/v2/boost/packages'],
    queryFn: async () => {
      try {
        const response = await correctApiRequest('/api/v2/boost/packages', 'GET');
        console.log("API Response:", response); // Для отладки
        if (response.success && response.data && response.data.packages) {
          // Преобразуем данные из API в формат компонента
          return response.data.packages.map((pkg: any) => ({
            id: pkg.id,
            name: pkg.name,
            priceTon: pkg.min_amount, // Оставляем как число
            bonusUni: pkg.uni_bonus,  // Оставляем как число
            rateTon: (pkg.daily_rate * 100), // Конвертируем в проценты как число
            rateUni: 0 // API не возвращает UNI rate, ставим 0
          }));
        }
        return [];
      } catch (error) {
        console.error("Failed to fetch TON Boost packages:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить TON Boost-пакеты",
          variant: "destructive",
        });
        return [];
      }
    }
  });

  const boostPackages = data || [];

  // ИСПРАВЛЕННЫЙ обработчик клика по буст-пакету
  const handleBoostClick = (boostId: number) => {
    console.log('[DEBUG] Нажата кнопка покупки TON Boost:', {
      boostId,
      tonConnectUI: !!tonConnectUI,
      tonConnectUIWallet: tonConnectUI?.wallet,
      isConnected: isTonWalletConnected(tonConnectUI)
    });

    // Сохраняем ID буста и ВСЕГДА показываем диалог выбора способа оплаты
    setSelectedBoostId(boostId);
    
    // ИСПРАВЛЕНИЕ: Всегда показываем диалог выбора (внутренний/внешний баланс)
    // Пользователь сам выберет подходящий способ оплаты
    setPaymentMethodDialogOpen(true);
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
    
    // Закрываем диалог выбора метода оплаты
    setPaymentMethodDialogOpen(false);
    setIsLoading(true);
    
    try {
      // Получаем ID пользователя
      let userIdStr = userId?.toString();
      if (!userIdStr) {
        userIdStr = getUserIdFromURL();
      }
      
      if (!userIdStr) {
        toast({
          title: "Ошибка",
          description: "Не удалось определить ID пользователя",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      const userIdNum = parseInt(userIdStr, 10);

      // Находим выбранный пакет
      const selectedPackage = boostPackages.find((p: TonBoostPackage) => p.id === boostId);
      if (!selectedPackage) {
        toast({
          title: "Ошибка",
          description: "Выбранный пакет не найден",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (paymentMethod === 'external_wallet') {
        // Проверяем подключение кошелька для внешней оплаты
        if (!isTonWalletConnected(tonConnectUI)) {
          toast({
            title: "Подключите кошелек",
            description: "Для оплаты через внешний кошелек необходимо подключить TON-кошелёк",
            variant: "destructive",
            action: (
              <Button 
                variant="default" 
                size="sm" 
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
          setIsLoading(false);
          return;
        }

        // Отправляем TON транзакцию через подключенный кошелек
        try {
          const transactionComment = createTonTransactionComment(
            Number(userId),
            boostId,
            'ton_boost_purchase'
          );

          const transactionRequest = {
            validUntil: Math.floor(Date.now() / 1000) + 300, // 5 минут
            messages: [
              {
                address: 'UQBlrUfJMIlAcyYzttyxV2xrrvaHHIKEKeetGZbDoitTRWT8',
                amount: (parseFloat(selectedPackage.priceTon) * 1e9).toString(),
                payload: transactionComment
              }
            ]
          };

          console.log('[DEBUG] Отправка транзакции TON:', transactionRequest);
          
          const result = await sendTonTransaction(tonConnectUI, transactionRequest);
          
          if (result?.boc) {
            // Транзакция успешно отправлена
            toast({
              title: "Транзакция отправлена",
              description: "TON Boost будет активирован после подтверждения транзакции",
              variant: "default"
            });

            // Обновляем данные
            queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
            queryClient.invalidateQueries({ queryKey: ['/api/v2/boost'] });
            queryClient.invalidateQueries({ queryKey: ['/api/user-boosts'] });
            queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
          } else {
            toast({
              title: "Транзакция отменена",
              description: "Транзакция не была выполнена или была отменена в кошельке",
              variant: "default"
            });
          }
        } catch (error: any) {
          console.error("Error sending TON transaction:", error);
          
          if (error instanceof WalletNotConnectedError) {
            toast({
              title: "Кошелек не подключен",
              description: "Пожалуйста, подключите TON-кошелёк, чтобы купить Boost-пакет.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Ошибка платежа",
              description: "Произошла ошибка при отправке платежа. Пожалуйста, попробуйте снова.",
              variant: "destructive"
            });
          }
        }
      } else {
        // Покупка через внутренний баланс
        try {
          console.log('[TON_BOOST] Отправка запроса на покупку через внутренний баланс:', {
            user_id: userId,
            boost_id: boostId,
            payment_method: paymentMethod,
            selectedPackage: selectedPackage,
            actualUserId: userId,
            userIdType: typeof userId
          });

          const data = await correctApiRequest('/api/v2/boost/purchase', 'POST', {
            user_id: userId.toString(),
            boost_id: boostId.toString(),
            payment_method: 'wallet'  // для внутреннего баланса используем 'wallet'
          });

          console.log('[TON_BOOST] Ответ от сервера:', data);

          if (data.success) {
            // МГНОВЕННОЕ ОБНОВЛЕНИЕ БАЛАНСА - обновляем UserContext сразу после получения новых данных
            if (data.balanceUpdate) {
              console.log('[TON_BOOST] Мгновенное обновление баланса UI:', {
                oldTon: data.balanceUpdate.previousTonBalance,
                newTon: data.balanceUpdate.tonBalance,
                deducted: data.balanceUpdate.deductedAmount
              });
              
              // МГНОВЕННОЕ ОБНОВЛЕНИЕ БАЛАНСА - вызываем refreshBalance сразу
              refreshBalance(true); // Принудительное обновление баланса из API
              
              // Дополнительно обновляем кэш для полной синхронизации
              queryClient.invalidateQueries({ queryKey: ['/api/v2/wallet/balance'] });
            }

            // Обновляем кэш пользователя и связанные данные для синхронизации
            queryClient.invalidateQueries({ queryKey: ['/api/v2/wallet/balance'] });
            queryClient.invalidateQueries({ queryKey: ['/api/v2/boost'] });
            queryClient.invalidateQueries({ queryKey: ['/api/user-boosts'] });
            queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
            queryClient.invalidateQueries({ queryKey: ['/api/v2/transactions'] });

            toast({
              title: "TON Boost активирован!",
              description: `${selectedPackage.name} успешно активирован. TON баланс обновлен мгновенно.`,
              variant: "default"
            });
          } else {
            toast({
              title: "Ошибка покупки",
              description: data.message || "Не удалось активировать TON Boost",
              variant: "destructive"
            });
          }
        } catch (error: any) {
          console.error('Error purchasing TON Boost:', error);
          toast({
            title: "Ошибка",
            description: "Произошла ошибка при покупке TON Boost",
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      console.error('Error in handleSelectPaymentMethod:', error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при обработке платежа",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingPackages) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            TON Boost Пакеты
          </CardTitle>
          <CardDescription>
            Загрузка доступных пакетов...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                TON Boost Пакеты
              </CardTitle>
              <CardDescription>
                Активируйте TON Boost для увеличения скорости заработка
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/v2/boost/packages'] });
                queryClient.invalidateQueries({ queryKey: ['/api/v2/ton-farming/boosts'] });
                toast({
                  title: "Данные обновлены",
                  description: "TON Boost пакеты перезагружены",
                  variant: "default"
                });
              }}
              className="flex items-center gap-1"
            >
              <RefreshCcw className="h-4 w-4" />
              Обновить
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {boostPackages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Пакеты недоступны
            </div>
          ) : (
            boostPackages.map((pkg: TonBoostPackage, index: number) => (
              <div key={pkg.id}>
                <div className="relative overflow-hidden border border-border/50 rounded-xl p-5 bg-gradient-to-br from-background via-card to-background transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-lg bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        {pkg.name}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-2 mt-3">
                        <div className="flex items-center gap-2">
                          <Coins className="h-4 w-4 text-yellow-500" />
                          <span>Минимальный депозит: <span className="font-semibold text-foreground">{formatNumberWithPrecision(pkg.priceTon, 0)} TON</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-green-500" />
                          <span>Бонус: <span className="font-semibold text-foreground">{formatNumberWithPrecision(pkg.bonusUni, 0)} UNI</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span>Доходность: <span className="font-semibold text-foreground">{formatNumberWithPrecision(pkg.rateTon, 1)}% в день</span></span>
                        </div>

                      </div>
                    </div>
                    <Button 
                      onClick={() => handleBoostClick(pkg.id)}
                      disabled={isLoading}
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-primary/30"
                    >
                      {isLoading && selectedBoostId === pkg.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Wallet className="h-5 w-5 mr-2" />
                          Купить
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Диалог выбора способа оплаты */}
      <PaymentMethodDialog
        open={paymentMethodDialogOpen}
        onOpenChange={setPaymentMethodDialogOpen}
        boostId={selectedBoostId}
        boostName={boostPackages.find((p: TonBoostPackage) => p.id === selectedBoostId)?.name || ''}
        boostPriceTon={boostPackages.find((p: TonBoostPackage) => p.id === selectedBoostId)?.priceTon.toString() || '0'}
        onSelectPaymentMethod={handleSelectPaymentMethod}
      />

      {/* Диалог статуса внешнего платежа */}
      {externalPaymentData && (
        <ExternalPaymentStatus
          open={externalPaymentDialogOpen}
          onOpenChange={setExternalPaymentDialogOpen}
          userId={externalPaymentData.userId}
          transactionId={externalPaymentData.transactionId}
          paymentLink={externalPaymentData.paymentLink || ''}
          boostName={externalPaymentData.boostName}
          onPaymentComplete={() => {
            setExternalPaymentDialogOpen(false);
            setExternalPaymentData(null);
            queryClient.invalidateQueries({ queryKey: ['/api/v2/boost/packages'] });
          }}
        />
      )}
    </>
  );
};

export default BoostPackagesCard;