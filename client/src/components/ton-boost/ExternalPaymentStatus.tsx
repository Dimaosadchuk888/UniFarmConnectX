import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface ExternalPaymentStatusProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  transactionId: number | null;
  paymentLink: string | null;
  boostName: string;
  onPaymentComplete: () => void;
}

enum PaymentStatus {
  WAITING = 'waiting',
  CHECKING = 'checking',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

const ExternalPaymentStatus: React.FC<ExternalPaymentStatusProps> = ({
  open,
  onOpenChange,
  userId,
  transactionId,
  paymentLink,
  boostName,
  onPaymentComplete
}) => {
  const [status, setStatus] = useState<PaymentStatus>(PaymentStatus.WAITING);
  const [timer, setTimer] = useState<number>(0);
  const queryClient = useQueryClient();

  // Мутация для проверки статуса платежа
  const checkPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!transactionId || !userId) return { success: false };
      
      setStatus(PaymentStatus.CHECKING);
      const response = await apiRequest('POST', '/api/ton-boosts/confirm-payment', {
        user_id: userId,
        transaction_id: transactionId
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setStatus(PaymentStatus.COMPLETED);
        
        // Инвалидируем кэш для обновления баланса и транзакций
        queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        queryClient.invalidateQueries({ queryKey: [`/api/ton-boosts/active`] });
        
        // Уведомляем родительский компонент о завершении платежа
        onPaymentComplete();
      } else {
        setStatus(PaymentStatus.WAITING);
      }
    },
    onError: () => {
      setStatus(PaymentStatus.FAILED);
    }
  });

  // Эффект для отслеживания времени ожидания
  useEffect(() => {
    if (!open || status === PaymentStatus.COMPLETED) {
      return;
    }

    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [open, status]);

  // Автоматическая проверка платежа каждые 15 секунд
  useEffect(() => {
    if (!open || status === PaymentStatus.COMPLETED || status === PaymentStatus.CHECKING) {
      return;
    }

    if (timer > 0 && timer % 15 === 0) {
      checkPaymentMutation.mutate();
    }
  }, [timer, open, status, checkPaymentMutation]);

  // Функция для открытия ссылки на оплату в новом окне
  const openPaymentLink = () => {
    if (paymentLink) {
      window.open(paymentLink, '_blank');
    }
  };

  // Функция для ручной проверки платежа
  const checkPaymentManually = () => {
    checkPaymentMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-blue-700/30 bg-card">
        <DialogHeader>
          <DialogTitle className="text-center text-xl text-white mb-2">
            Оплата через TON кошелек
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {status === PaymentStatus.COMPLETED ? (
              'Платеж успешно обработан!'
            ) : (
              <>Ожидание оплаты пакета <span className="font-semibold text-blue-400">{boostName}</span> через ваш TON кошелек.</>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 items-center mt-4">
          {status === PaymentStatus.WAITING && (
            <>
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 mb-2">
                <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Для завершения покупки, перейдите по ссылке в ваш TON кошелек и подтвердите платеж.
              </p>
              <Button 
                onClick={openPaymentLink}
                className="w-full bg-gradient-to-r from-blue-500 to-teal-400 hover:opacity-90"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Открыть TON кошелек
              </Button>
              
              <div className="mt-2 flex items-center justify-between w-full">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={checkPaymentManually}
                  disabled={checkPaymentMutation.isPending}
                  className="text-xs"
                >
                  {checkPaymentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Проверка...
                    </>
                  ) : (
                    'Проверить оплату'
                  )}
                </Button>
                <span className="text-xs text-muted-foreground">
                  Ожидание: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </>
          )}
          
          {status === PaymentStatus.CHECKING && (
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 text-blue-400 animate-spin" />
              <p className="text-center text-muted-foreground">Проверка платежа...</p>
            </div>
          )}
          
          {status === PaymentStatus.COMPLETED && (
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-2">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-center text-muted-foreground">
                Поздравляем! Ваш TON Boost успешно активирован, и бонусные UNI зачислены на ваш баланс.
              </p>
              <Button 
                onClick={() => onOpenChange(false)}
                className="w-full bg-gradient-to-r from-green-500 to-teal-400 hover:opacity-90"
              >
                Продолжить
              </Button>
            </div>
          )}
          
          {status === PaymentStatus.FAILED && (
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-2">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-center text-muted-foreground">
                Произошла ошибка при проверке платежа. Пожалуйста, попробуйте снова или свяжитесь с поддержкой.
              </p>
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button 
                  onClick={checkPaymentManually}
                  variant="outline"
                >
                  Проверить снова
                </Button>
                <Button 
                  onClick={() => onOpenChange(false)}
                  variant="destructive"
                >
                  Закрыть
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExternalPaymentStatus;