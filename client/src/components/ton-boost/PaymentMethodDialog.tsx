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
  const handleSelectMethod = (method: 'internal_balance' | 'external_wallet') => {
    if (boostId !== null) {
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