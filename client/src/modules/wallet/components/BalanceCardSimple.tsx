/**
 * Упрощенная карточка баланса без WebSocket подключений
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { formatBalance } from '../../../shared/utils';
import type { User } from '../../../core/types';

interface BalanceCardSimpleProps {
  user: User;
}

export const BalanceCardSimple: React.FC<BalanceCardSimpleProps> = ({ user }) => {
  const balanceUni = formatBalance(user.balance_uni);
  const balanceTon = formatBalance(user.balance_ton, 4);
  const farmingBalance = formatBalance(user.uni_farming_balance || '0');
  
  const totalUni = parseFloat(balanceUni) + parseFloat(farmingBalance);
  const usdValue = parseFloat(balanceTon) * 5.2; // Примерный курс TON

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
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
            <div className="text-sm text-blue-600 font-medium mb-1">UNI Токены</div>
            <div className="text-2xl font-bold text-blue-900">{balanceUni}</div>
            {parseFloat(farmingBalance) > 0 && (
              <div className="text-xs text-blue-600 mt-1">
                + {farmingBalance} в фарминге
              </div>
            )}
          </div>
          
          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
            <div className="text-sm text-purple-600 font-medium mb-1">TON</div>
            <div className="text-2xl font-bold text-purple-900">{balanceTon}</div>
            <div className="text-xs text-purple-600 mt-1">
              ≈ ${usdValue.toFixed(2)} USD
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Общий UNI баланс</span>
            <span className="font-semibold text-gray-900">{totalUni.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">ID пользователя</span>
            <span className="text-sm font-mono text-gray-500">#{user.id}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};