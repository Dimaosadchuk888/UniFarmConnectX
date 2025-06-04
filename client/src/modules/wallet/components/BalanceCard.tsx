/**
 * Карточка баланса с полной функциональностью
 * Объединяет лучшие черты обеих версий
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { formatBalance } from '../../../shared/utils';
import type { User } from '../../../core/types';

interface BalanceCardProps {
  user: User;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ user }) => {
  // Безопасная нормализация данных баланса с утилитами форматирования
  const balanceUni = parseFloat(formatBalance(user.balance_uni));
  const balanceTon = parseFloat(formatBalance(user.balance_ton, 4));
  const farmingBalance = parseFloat(formatBalance(user.uni_farming_balance || '0'));
  
  const totalUni = balanceUni + farmingBalance;
  const usdValue = balanceTon * 5.2; // Примерный курс TON

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Баланс кошелька</span>
          <span className="text-sm font-normal text-green-600">
            {user.wallet || user.ton_wallet_address ? '● Подключен' : '○ Не подключен'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-primary/5 rounded-lg">
            <p className="text-sm text-muted-foreground">UNI Токены</p>
            <p className="text-2xl font-bold">{totalUni.toFixed(2)}</p>
            {farmingBalance > 0 && (
              <p className="text-xs text-muted-foreground">
                ({farmingBalance.toFixed(2)} в фарминге)
              </p>
            )}
          </div>
          
          <div className="p-4 bg-secondary/5 rounded-lg">
            <p className="text-sm text-muted-foreground">TON</p>
            <p className="text-2xl font-bold">{balanceTon.toFixed(4)}</p>
            <p className="text-xs text-muted-foreground">
              ≈ ${usdValue.toFixed(2)} USD
            </p>
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Общий UNI</span>
            <span className="font-medium">{totalUni.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-muted-foreground">Статус кошелька</span>
            <span className="text-sm font-medium text-green-600">
              {user.wallet || user.ton_wallet_address ? 'Подключен' : 'Не подключен'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};