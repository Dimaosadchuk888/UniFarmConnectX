import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog';

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boostId: number | null;
  boostName: string;
  onSelectPaymentMethod: (boostId: number, paymentMethod: 'internal_balance' | 'external_wallet') => void;
}

const PaymentMethodDialog: React.FC<PaymentMethodDialogProps> = ({
  open,
  onOpenChange,
  boostId,
  boostName,
  onSelectPaymentMethod
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // Обработчик выбора способа оплаты
  const handleSelectPayment = (method: 'internal_balance' | 'external_wallet') => {
    if (!boostId) return;
    
    setIsLoading(true);
    onSelectPaymentMethod(boostId, method);
    // Модальное окно будет закрыто вызывающим компонентом
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-purple-700/30 bg-card">
        <DialogHeader>
          <DialogTitle className="text-center text-xl text-white mb-2">
            Выберите способ оплаты
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Вы можете оплатить буст <span className="font-semibold text-primary">{boostName}</span> с баланса UniFarm или напрямую из TON-кошелька.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 mt-4">
          <button 
            onClick={() => handleSelectPayment('internal_balance')}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg font-medium bg-gradient-to-r from-purple-500 to-indigo-600 text-white transition-all duration-300 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12H21M3 12C3 16.9706 7.02944 21 12 21M3 12C3 7.02944 7.02944 3 12 3M21 12C21 16.9706 16.9706 21 12 21M21 12C21 7.02944 16.9706 3 12 3M12 3C12 3 15 6 15 12C15 18 12 21 12 21M12 3C12 3 9 6 9 12C9 18 12 21 12 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            Оплатить с внутреннего баланса
          </button>

          <button 
            onClick={() => handleSelectPayment('external_wallet')}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-teal-400 text-white transition-all duration-300 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 12L8 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            Оплатить с TON кошелька
          </button>
        </div>
        
        <div className="mt-6 text-xs text-center text-muted-foreground">
          Оплачивая через внешний кошелек, убедитесь, что переводите точную сумму, указанную в платежной ссылке.
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentMethodDialog;