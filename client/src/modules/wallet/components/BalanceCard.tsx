/**
 * Карточка баланса с исправленной валидацией
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import type { User } from '../../../core/types';

interface BalanceCardProps {
  user: User;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ user }) => {
  // Безопасная нормализация данных баланса
  const balanceUni = Number(user.balance_uni || '0');
  const balanceTon = Number(user.balance_ton || '0');
  
  const totalUniValue = balanceUni + Number(user.uni_farming_balance || '0');

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Баланс кошелька
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-primary/5 rounded-lg">
            <p className="text-sm text-muted-foreground">UNI Токены</p>
            <p className="text-2xl font-bold">{balanceUni.toFixed(2)}</p>
            {user.uni_farming_balance && Number(user.uni_farming_balance) > 0 && (
              <p className="text-xs text-muted-foreground">
                + {Number(user.uni_farming_balance).toFixed(2)} в фарминге
              </p>
            )}
          </div>
          
          <div className="p-4 bg-secondary/5 rounded-lg">
            <p className="text-sm text-muted-foreground">TON</p>
            <p className="text-2xl font-bold">{balanceTon.toFixed(4)}</p>
            <p className="text-xs text-muted-foreground">
              ≈ ${(balanceTon * 5.2).toFixed(2)} USD
            </p>
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Общий UNI</span>
            <span className="font-medium">{totalUniValue.toFixed(2)}</span>
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