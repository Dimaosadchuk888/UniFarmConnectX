import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { FiLoader as Loader2, FiCheckCircle as CheckCircle, FiXCircle as XCircle } from 'react-icons/fi';
import { formatNumberWithPrecision } from '../../lib/utils';

interface ExternalPaymentStatusProps {
  isExternalPaymentInProgress: boolean;
  externalPaymentBoostId: string | null;
  boostPackages: any[];
  onCheckPaymentStatus: () => void;
  onCancelExternalPayment: () => void;
  externalPaymentStatus?: {
    status: 'pending' | 'success' | 'failed';
    message?: string;
  } | null;
}

const ExternalPaymentStatus: React.FC<ExternalPaymentStatusProps> = ({
  isExternalPaymentInProgress,
  externalPaymentBoostId,
  boostPackages,
  onCheckPaymentStatus,
  onCancelExternalPayment,
  externalPaymentStatus,
}) => {
  if (!isExternalPaymentInProgress) return null;

  const selectedPackage = boostPackages.find(pkg => pkg.id === externalPaymentBoostId);
  if (!selectedPackage) return null;

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {externalPaymentStatus?.status === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : externalPaymentStatus?.status === 'failed' ? (
            <XCircle className="w-5 h-5 text-red-500" />
          ) : (
            <Loader2 className="w-5 h-5 animate-spin" />
          )}
          Статус оплаты: {selectedPackage.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Сумма:</span>
            <span className="font-semibold">{formatNumberWithPrecision(selectedPackage.price)} TON</span>
          </div>
          
          {externalPaymentStatus?.message && (
            <p className="text-sm text-muted-foreground">
              {externalPaymentStatus.message}
            </p>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={onCheckPaymentStatus}
              variant="default"
              size="sm"
              disabled={externalPaymentStatus?.status === 'success'}
            >
              {externalPaymentStatus?.status === 'success' ? 'Оплачено' : 'Проверить статус'}
            </Button>
            
            {externalPaymentStatus?.status !== 'success' && (
              <Button 
                onClick={onCancelExternalPayment}
                variant="outline"
                size="sm"
              >
                Отменить
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExternalPaymentStatus;