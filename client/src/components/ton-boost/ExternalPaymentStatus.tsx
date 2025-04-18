import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { apiRequest } from '../../lib/queryClient';

interface ExternalPaymentStatusProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  transactionId: number | null;
  paymentLink: string | null;
  boostName: string;
  onPaymentComplete: () => void;
}

// Состояния платежа
enum PaymentStatus {
  PENDING = 'pending',
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
  const [status, setStatus] = useState<PaymentStatus>(PaymentStatus.PENDING);
  const [message, setMessage] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [checkCount, setCheckCount] = useState<number>(0);
  
  // Открываем кошелек для оплаты при первом открытии диалога
  useEffect(() => {
    if (open && paymentLink && status === PaymentStatus.PENDING && checkCount === 0) {
      window.open(paymentLink, '_blank');
    }
  }, [open, paymentLink, status, checkCount]);
  
  // Проверяем статус транзакции
  const checkPaymentStatus = async () => {
    if (!transactionId || !userId) return;
    
    setIsChecking(true);
    
    try {
      const response = await apiRequest('POST', '/api/ton-boosts/confirm-payment', {
        user_id: userId,
        transaction_id: transactionId
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus(PaymentStatus.COMPLETED);
        setMessage(data.message || 'Платеж успешно подтвержден! TON Boost активирован.');
        onPaymentComplete();
      } else {
        setMessage(data.message || 'Платеж еще не подтвержден. Пожалуйста, убедитесь, что вы завершили оплату через TON кошелек.');
        // Увеличиваем счетчик проверок
        setCheckCount(prevCount => prevCount + 1);
        
        // Если проверили более 5 раз и платеж все еще не подтвержден - считаем его неудачным
        if (checkCount >= 5) {
          setStatus(PaymentStatus.FAILED);
          setMessage('Платеж не подтвержден после нескольких попыток. Возможно, транзакция еще в обработке или не была выполнена.');
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setMessage('Произошла ошибка при проверке платежа. Пожалуйста, попробуйте позже.');
      
      // Если ошибка случилась более 3 раз - считаем платеж неудачным
      if (checkCount >= 3) {
        setStatus(PaymentStatus.FAILED);
      }
    } finally {
      setIsChecking(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {status === PaymentStatus.COMPLETED
              ? 'Платеж успешно завершен'
              : status === PaymentStatus.FAILED
                ? 'Ошибка платежа'
                : 'Ожидание платежа'}
          </DialogTitle>
          <DialogDescription>
            {status === PaymentStatus.PENDING
              ? `Оплата буст-пакета ${boostName} через TON кошелек`
              : status === PaymentStatus.COMPLETED
                ? `Буст-пакет ${boostName} успешно активирован`
                : `Возникла проблема с активацией буст-пакета ${boostName}`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center p-4 space-y-4">
          {status === PaymentStatus.PENDING && (
            <>
              <div className="flex items-center justify-center h-20 w-20 bg-primary/10 rounded-full">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Пожалуйста, завершите оплату в вашем TON кошельке.
                Сумма транзакции должна точно соответствовать стоимости буст-пакета.
              </p>
              <p className="text-xs text-center text-muted-foreground">
                Важно: транзакция должна содержать комментарий, который был автоматически добавлен в платежную ссылку.
              </p>
            </>
          )}
          
          {status === PaymentStatus.COMPLETED && (
            <>
              <div className="flex items-center justify-center h-20 w-20 bg-green-900/20 rounded-full">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {message}
              </p>
            </>
          )}
          
          {status === PaymentStatus.FAILED && (
            <>
              <div className="flex items-center justify-center h-20 w-20 bg-red-900/20 rounded-full">
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {message}
              </p>
              <p className="text-xs text-center text-muted-foreground">
                Если вы считаете, что ваш платеж был успешным, пожалуйста, попробуйте проверить еще раз или обратитесь в поддержку.
              </p>
            </>
          )}
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {status === PaymentStatus.PENDING && (
            <>
              {paymentLink && (
                <Button 
                  variant="outline" 
                  onClick={() => window.open(paymentLink, '_blank')}
                  className="w-full"
                >
                  Открыть TON кошелек снова
                </Button>
              )}
              <Button 
                onClick={checkPaymentStatus} 
                disabled={isChecking}
                className="w-full"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Проверяем...
                  </>
                ) : (
                  'Проверить платеж'
                )}
              </Button>
            </>
          )}
          
          {status === PaymentStatus.COMPLETED && (
            <Button 
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Закрыть
            </Button>
          )}
          
          {status === PaymentStatus.FAILED && (
            <>
              <Button 
                variant="outline" 
                onClick={() => {
                  setStatus(PaymentStatus.PENDING);
                  setCheckCount(0);
                  if (paymentLink) {
                    window.open(paymentLink, '_blank');
                  }
                }}
                className="w-full"
              >
                Попробовать снова
              </Button>
              <Button 
                onClick={() => onOpenChange(false)}
                variant="destructive"
                className="w-full"
              >
                Отменить
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExternalPaymentStatus;