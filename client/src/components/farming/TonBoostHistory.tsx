import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TonBoostHistoryItem {
  id: number;
  date: Date;
  amount: string;
  boostName: string;
  yieldPercent: string;
}

interface TonBoostHistoryProps {
  userId: number;
}

// Соответствие между ID буста и процентом доходности
const boostYieldMapping: Record<number, string> = {
  1: '0.5%',  // Boost 1
  2: '1%',    // Boost 5
  3: '2%',    // Boost 15
  4: '2.5%'   // Boost 25
};

// Соответствие между ID буста и именем
const boostNameMapping: Record<number, string> = {
  1: 'Boost 1',
  2: 'Boost 5',
  3: 'Boost 15',
  4: 'Boost 25'
};

// Соответствие между ID буста и ценой в TON
const boostTonPriceMapping: Record<number, string> = {
  1: '1',
  2: '5',
  3: '15',
  4: '25'
};

const TonBoostHistory: React.FC<TonBoostHistoryProps> = ({ userId }) => {
  const [historyItems, setHistoryItems] = useState<TonBoostHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Получаем данные о транзакциях пользователя
  const { data: transactionsResponse } = useQuery<any>({
    queryKey: [`/api/transactions?user_id=${userId}`],
  });

  useEffect(() => {
    if (transactionsResponse && transactionsResponse.success && Array.isArray(transactionsResponse.data)) {
      // Фильтруем транзакции, связанные с покупкой TON бустов
      const boostTransactions = transactionsResponse.data.filter(
        (tx: any) => tx.type === 'boost_purchase'
      );
      
      // Преобразуем транзакции в записи истории
      const historyItems: TonBoostHistoryItem[] = boostTransactions.map((tx: any) => ({
        id: tx.id,
        date: new Date(tx.created_at),
        amount: boostTonPriceMapping[tx.boost_id] || '0',
        boostName: boostNameMapping[tx.boost_id] || 'Неизвестный буст',
        yieldPercent: boostYieldMapping[tx.boost_id] || '0%'
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

  if (loading) {
    return (
      <div className="mt-6">
        <h3 className="text-md font-semibold mb-3 text-foreground/80">История TON Boost-пакетов</h3>
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
        <h3 className="text-md font-semibold mb-3 text-foreground/80">История TON Boost-пакетов</h3>
        <div className="bg-card rounded-lg p-5 text-center">
          <div className="text-foreground/50 mb-1">
            <i className="fas fa-rocket text-lg"></i>
          </div>
          <p className="text-sm text-foreground/70">У вас пока нет активированных TON буст-пакетов</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-md font-semibold mb-3 text-foreground/80">История TON Boost-пакетов</h3>
      <div className="bg-card rounded-lg p-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead>
              <tr className="border-b border-gray-800/50">
                <th className="py-2 px-3 text-left text-xs font-medium text-foreground/60">Дата активации</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-foreground/60">Буст пакет</th>
                <th className="py-2 px-3 text-right text-xs font-medium text-foreground/60">Стоимость</th>
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
                  <td className="py-3 px-3 text-sm text-foreground/80">{item.boostName}</td>
                  <td className="py-3 px-3 text-sm text-right">
                    <span className="text-[#6DBFFF]">{item.amount}</span>
                    <span className="text-xs text-foreground/50 ml-1">TON</span>
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

export default TonBoostHistory;