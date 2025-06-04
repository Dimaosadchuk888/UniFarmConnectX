/**
 * UNI Фарминг карточка с исправленной валидацией
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import type { User } from '../../../core/types';

interface UniFarmingCardProps {
  user: User;
}

export const UniFarmingCard: React.FC<UniFarmingCardProps> = ({ user }) => {
  // Безопасная нормализация данных
  const farmingBalance = Number(user.uni_farming_balance || '0');
  const farmingRate = Number(user.uni_farming_rate || '0');
  const depositAmount = Number(user.uni_deposit_amount || '0');
  
  const isActive = farmingBalance > 0 || depositAmount > 0;
  const startDate = user.uni_farming_start_timestamp 
    ? new Date(user.uni_farming_start_timestamp).toLocaleDateString()
    : 'Не активирован';

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          UNI Фарминг
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Статус</p>
            <p className="font-medium">
              {isActive ? 'Активен' : 'Неактивен'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Баланс</p>
            <p className="font-medium">{farmingBalance.toFixed(2)} UNI</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Скорость</p>
            <p className="font-medium">{farmingRate.toFixed(4)} UNI/ч</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Депозит</p>
            <p className="font-medium">{depositAmount.toFixed(2)} UNI</p>
          </div>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground">Дата активации</p>
          <p className="font-medium">{startDate}</p>
        </div>
        
        {!isActive && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-center">
              Фарминг не активирован. Пополните депозит для начала.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};