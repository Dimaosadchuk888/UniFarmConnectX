import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wallet, CreditCard } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { isTonWalletConnected, isTonPaymentReady } from '../../services/tonConnectService';

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boostId: number | null;
  boostName: string;
  onSelectPaymentMethod: (boostId: number, method: 'internal_balance' | 'external_wallet') => void;
}

const PaymentMethodDialog: React.FC<PaymentMethodDialogProps> = ({
  open,
  onOpenChange,
  boostId,
  boostName,
  onSelectPaymentMethod,
}) => {
  const { toast } = useToast();
  const [tonConnectUI] = useTonConnectUI();

  const handleSelectMethod = (method: 'internal_balance' | 'external_wallet') => {
    console.log("[DIALOG DEBUG] handleSelectMethod вызван:", { method, boostId });
    if (boostId !== null) {
      // Если выбран внешний кошелек, проверяем подключение TonConnect
      if (method === 'external_wallet') {
        if (!tonConnectUI) {
          console.error('[ERROR] tonConnectUI not initialized in PaymentMethodDialog');
          toast({
            title: "Ошибка инициализации",
            description: "Произошла ошибка инициализации TonConnect. Пожалуйста, обновите страницу и попробуйте снова.",
            variant: "destructive"
          });
          onOpenChange(false);
          return;
        }
        
        // Проверяем готовность к транзакциям
        const isReady = isTonPaymentReady(tonConnectUI);
        
        if (!isReady) {
          const isConnected = isTonWalletConnected(tonConnectUI);
          
          console.log('[DEBUG] PaymentMethodDialog check wallet:', {
            tonConnectUI: !!tonConnectUI,
            isReady,
            isConnected,
            wallet: tonConnectUI.wallet
          });
          
          if (isConnected) {
            // Кошелек подключен, но не готов к транзакциям
            toast({
              title: "Ошибка кошелька",
              description: "Ваш кошелек подключен, но не готов для отправки TON. Попробуйте переподключить кошелек.",
              variant: "destructive"
            });
          } else {
            // Кошелек просто не подключен
            toast({
              title: "Кошелек не подключен",
              description: "Пожалуйста, подключите TON-кошелёк, чтобы оплатить с помощью внешнего кошелька.",
              variant: "destructive",
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
          }
          
          onOpenChange(false);
          return;
        }
      }
      
      onSelectPaymentMethod(boostId, method);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-blue-950/90 border-blue-800">
        <DialogHeader>
          <DialogTitle className="text-blue-200">Выберите способ оплаты</DialogTitle>
          <DialogDescription className="text-blue-400">
            Для активации TON Boost "{boostName}" выберите удобный способ оплаты
          </DialogDescription>
        </DialogHeader>
        
        {/* Debug info для разработки */}
        <div className="text-xs text-slate-500 mb-2">
          DEBUG: BoostID={boostId}, TonConnectReady={isTonPaymentReady(tonConnectUI) ? "Да" : "Нет"}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Button
            variant="outline"
            className="flex flex-col items-center justify-center h-32 space-y-2 border-blue-600 hover:bg-blue-800/30 hover:text-blue-200"
            onClick={() => handleSelectMethod('internal_balance')}
          >
            <CreditCard className="h-10 w-10 text-blue-400" />
            <span className="text-base">Внутренний баланс</span>
            <span className="text-xs text-blue-400">Использовать TON с баланса приложения</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex flex-col items-center justify-center h-32 space-y-2 border-blue-600 hover:bg-blue-800/30 hover:text-blue-200"
            onClick={() => handleSelectMethod('external_wallet')}
          >
            <Wallet className="h-10 w-10 text-blue-400" />
            <span className="text-base">Внешний кошелек</span>
            <span className="text-xs text-blue-400">Оплатить с помощью TON кошелька</span>
          </Button>
        </div>
        
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
          >
            Отмена
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentMethodDialog;