import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wallet, Coins } from "lucide-react";

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
  const handleSelectPaymentMethod = (method: 'internal_balance' | 'external_wallet') => {
    if (boostId !== null) {
      onSelectPaymentMethod(boostId, method);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Выберите способ оплаты</DialogTitle>
          <DialogDescription>
            Выберите как вы хотите оплатить буст-пакет {boostName}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          <button
            onClick={() => handleSelectPaymentMethod('internal_balance')}
            className="flex items-center p-4 border border-border rounded-lg transition-all hover:bg-accent hover:text-accent-foreground"
          >
            <div className="mr-4 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-sm font-medium">Внутренний баланс</h4>
              <p className="text-xs text-muted-foreground">Использовать TON с вашего внутреннего баланса в приложении</p>
            </div>
          </button>
          
          <button
            onClick={() => handleSelectPaymentMethod('external_wallet')}
            className="flex items-center p-4 border border-border rounded-lg transition-all hover:bg-accent hover:text-accent-foreground"
          >
            <div className="mr-4 h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-sm font-medium">Внешний TON кошелек</h4>
              <p className="text-xs text-muted-foreground">Использовать ваш TON кошелек для оплаты (Tonkeeper, TonHub и др.)</p>
            </div>
          </button>
        </div>
        
        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Отмена
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentMethodDialog;