import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { FiDollarSign as Coins, FiCreditCard as Wallet, FiX as X } from 'react-icons/fi';
import { TonConnectUI } from '@tonconnect/ui';

interface PaymentMethodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPaymentMethod: (method: 'internal' | 'external') => void;
  selectedBoostId: string | null;
  boostPackages: any[];
  tonConnectUI: TonConnectUI | null;
}

const PaymentMethodDialog: React.FC<PaymentMethodDialogProps> = ({
  isOpen,
  onClose,
  onSelectPaymentMethod,
  selectedBoostId,
  boostPackages,
  tonConnectUI,
}) => {
  if (!isOpen) return null;
  
  const selectedPackage = boostPackages.find(pkg => pkg.id === selectedBoostId);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="relative">
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2"
          >
            <X className="w-4 h-4" />
          </Button>
          <CardTitle>Выберите способ оплаты</CardTitle>
          <CardDescription>
            {selectedPackage && (
              <span className="text-primary font-semibold">
                {selectedPackage.name} - {selectedPackage.price} TON
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Button
              onClick={() => onSelectPaymentMethod('internal')}
              className="flex items-center justify-center gap-2 h-16"
              variant="outline"
            >
              <Coins className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Внутренний баланс</div>
                <div className="text-sm text-muted-foreground">Оплата с баланса UniFarm</div>
              </div>
            </Button>

            <Button
              onClick={() => onSelectPaymentMethod('external')}
              className="flex items-center justify-center gap-2 h-16"
              variant="outline"
              disabled={!tonConnectUI}
            >
              <Wallet className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">TON Wallet</div>
                <div className="text-sm text-muted-foreground">
                  {tonConnectUI ? 'Оплата через внешний кошелек' : 'Подключите кошелек'}
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentMethodDialog;