import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Определяем типы для API ответа
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface Transaction {
  id: number;
  user_id: number;
  type: string;
  created_at: string;
  amount: string;
  boost_id?: number;
}

interface UniFarmingHistoryItem {
  id: number;
  date: Date;
  amount: string;
  yieldPercent: string;
}

interface UniFarmingHistoryProps {
  userId: number;
}

const UniFarmingHistory: React.FC<UniFarmingHistoryProps> = ({ userId }) => {
  const [historyItems, setHistoryItems] = useState<UniFarmingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Здесь мы будем получать данные о транзакциях пользователя - их можно использовать
  // для создания истории фарминг-пакетов
  const { data: transactionsResponse } = useQuery<ApiResponse<Transaction[]>>({
    queryKey: [`/api/transactions?user_id=${userId}`],
  });

  useEffect(() => {
    // Логирование для отладки
    console.debug("[DEBUG] TransactionHistory - User ID:", userId);
    
    if (transactionsResponse && transactionsResponse.success && Array.isArray(transactionsResponse.data)) {
      // Фильтруем транзакции, связанные с фармингом UNI
      const farmingTransactions = transactionsResponse.data.filter(
        (tx: any) => tx.type === 'farming_start' || tx.type === 'farming_deposit'
      );
      
      // Преобразуем транзакции в записи истории
      const historyItems: UniFarmingHistoryItem[] = farmingTransactions.map((tx: any) => ({
        id: tx.id,
        date: new Date(tx.created_at),
        amount: tx.amount,
        yieldPercent: '0.5%' // Фиксированная доходность UNI фарминга
      }));
      
      // Сортируем по дате (сначала новые)
      historyItems.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      setHistoryItems(historyItems);
      setLoading(false);
    }
  }, [transactionsResponse, userId]);

  // Форматирование даты в удобочитаемом виде
  const formatDate = (date: Date): string => {
    return format(date, 'dd MMM yyyy, HH:mm', { locale: ru });
  };

  // Форматирование числа с разделителями
  const formatNumber = (value: string): string => {
    try {
      return parseFloat(value).toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } catch (e) {
      return '0.00';
    }
  };

  if (loading) {
    return (
      <div className="mt-6">
        <h3 className="text-md font-semibold mb-3 text-foreground/80">История UNI фарминга</h3>
        <div className="bg-card rounded-lg p-4">
          <div className="flex justify-center p-4">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (historyItems.length === 0) {
    return (
      <div className="mt-6">
        <h3 className="text-md font-semibold mb-3 text-foreground/80">История UNI фарминга</h3>
        <div className="bg-card rounded-lg p-5 text-center">
          <div className="text-foreground/50 mb-1">
            <i className="fas fa-history text-lg"></i>
          </div>
          <p className="text-sm text-foreground/70">У вас пока нет истории фарминга UNI</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-md font-semibold mb-3 text-foreground/80">История UNI фарминга</h3>
      <div className="bg-card rounded-lg p-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead>
              <tr className="border-b border-gray-800/50">
                <th className="py-2 px-3 text-left text-xs font-medium text-foreground/60">Дата</th>
                <th className="py-2 px-3 text-right text-xs font-medium text-foreground/60">Сумма</th>
                <th className="py-2 px-3 text-right text-xs font-medium text-foreground/60">Доходность</th>
              </tr>
            </thead>
            <tbody>
              {historyItems.map((item) => (
                <tr 
                  key={item.id} 
                  className="border-b border-gray-800/30 hover:bg-black/20 transition-colors"
                >
                  <td className="py-3 px-3 text-sm text-foreground/80">{formatDate(item.date)}</td>
                  <td className="py-3 px-3 text-sm text-right">
                    <span className="text-primary">{formatNumber(item.amount)}</span>
                    <span className="text-xs text-foreground/50 ml-1">UNI</span>
                  </td>
                  <td className="py-3 px-3 text-sm text-right">
                    <span className="text-green-400">{item.yieldPercent}</span>
                    <span className="text-xs text-foreground/50 ml-1">в день</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UniFarmingHistory;