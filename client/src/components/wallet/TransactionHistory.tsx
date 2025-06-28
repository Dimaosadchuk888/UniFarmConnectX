import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '../../contexts/userContext';
import { apiRequest } from '../../lib/queryClient';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import QueryErrorBoundary from '../../components/common/QueryErrorBoundary';

interface Transaction {
  id: number;
  type: string;
  amount_uni?: number;
  amount_ton?: number;
  created_at: string;
  status: string;
  description?: string;
}

/**
 * Компонент истории транзакций
 */
const TransactionHistoryComponent: React.FC = () => {
  const { userId } = useUser();
  const [showAll, setShowAll] = useState(false);
  
  // Получение истории транзакций
  const { data: transactions, isLoading } = useQuery({
    queryKey: userId ? [`/api/v2/wallet/transactions?limit=${showAll ? 100 : 10}`] : [],
    enabled: !!userId,
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return <i className="fas fa-arrow-down text-green-400"></i>;
      case 'WITHDRAWAL':
        return <i className="fas fa-arrow-up text-red-400"></i>;
      case 'FARMING_REWARD':
        return <i className="fas fa-seedling text-yellow-400"></i>;
      case 'REFERRAL_REWARD':
        return <i className="fas fa-users text-blue-400"></i>;
      case 'DAILY_BONUS':
        return <i className="fas fa-gift text-purple-400"></i>;
      case 'MISSION_REWARD':
        return <i className="fas fa-trophy text-orange-400"></i>;
      default:
        return <i className="fas fa-exchange-alt text-gray-400"></i>;
    }
  };

  const getTransactionTitle = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return 'Пополнение';
      case 'WITHDRAWAL':
        return 'Вывод';
      case 'FARMING_REWARD':
        return 'Награда за фарминг';
      case 'REFERRAL_REWARD':
        return 'Реферальная награда';
      case 'DAILY_BONUS':
        return 'Ежедневный бонус';
      case 'MISSION_REWARD':
        return 'Награда за миссию';
      default:
        return 'Транзакция';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Выполнено</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">В обработке</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Ошибка</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{status}</Badge>;
    }
  };

  const formatAmount = (transaction: Transaction) => {
    if (transaction.amount_uni && transaction.amount_uni > 0) {
      return `+${transaction.amount_uni.toFixed(2)} UNI`;
    }
    if (transaction.amount_ton && transaction.amount_ton > 0) {
      return `+${transaction.amount_ton.toFixed(4)} TON`;
    }
    return '0';
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <i className="fas fa-spinner fa-spin text-primary text-2xl"></i>
          </div>
        </CardContent>
      </Card>
    );
  }

  const transactionList = (transactions as any)?.data || [];

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white flex items-center justify-between">
          <span className="flex items-center gap-2">
            <i className="fas fa-history text-primary"></i>
            История транзакций
          </span>
          {transactionList.length > 10 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="text-primary hover:text-primary/80"
            >
              {showAll ? 'Свернуть' : 'Показать все'}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactionList.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-inbox text-gray-600 text-4xl mb-4"></i>
            <p className="text-gray-400">Транзакций пока нет</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactionList.slice(0, showAll ? undefined : 10).map((transaction: Transaction) => (
              <div
                key={transaction.id}
                className="bg-gray-800 rounded-lg p-4 flex items-center justify-between hover:bg-gray-800/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div>
                    <p className="font-medium text-white">{getTransactionTitle(transaction.type)}</p>
                    <p className="text-sm text-gray-400">
                      {format(new Date(transaction.created_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-bold ${transaction.type.includes('WITHDRAWAL') ? 'text-red-400' : 'text-green-400'}`}>
                    {formatAmount(transaction)}
                  </span>
                  {getStatusBadge(transaction.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Обёртка с ErrorBoundary
const TransactionHistory: React.FC = () => {
  const queryClient = useQueryClient();
  const { userId } = useUser();
  
  const handleReset = () => {
    if (userId) {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/v2/wallet/transactions'] 
      });
    }
  };
  
  return (
    <QueryErrorBoundary
      onReset={handleReset}
      queryKey={userId ? ['/api/v2/wallet/transactions'] : undefined}
      errorTitle="Ошибка загрузки транзакций"
      errorDescription="Не удалось загрузить историю ваших транзакций. Пожалуйста, обновите страницу или повторите позже."
      resetButtonText="Обновить историю"
    >
      <TransactionHistoryComponent />
    </QueryErrorBoundary>
  );
};

export default TransactionHistory;