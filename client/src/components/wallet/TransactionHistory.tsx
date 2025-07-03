import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/contexts/userContext';
import { useNotification } from '@/contexts/NotificationContext';
import StyledTransactionItem from './StyledTransactionItem';

// Типы транзакций согласно схеме базы данных
interface Transaction {
  id: number;
  user_id: number;
  type: 'deposit' | 'withdrawal' | 'farming_reward' | 'referral_bonus' | 'mission_reward' | 'boost_purchase';
  amount: string;
  currency: 'UNI' | 'TON';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transaction_hash?: string;
  wallet_address?: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Компонент истории транзакций согласно UX спецификации
 * Отображает все транзакции пользователя с фильтрацией и анимацией
 */
const TransactionHistory: React.FC = () => {
  // Состояние для активного фильтра
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNI' | 'TON'>('ALL');
  
  // Состояние для пагинации
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  
  // Получаем данные пользователя из контекста
  const { userId } = useUser();
  
  // Получаем доступ к системе уведомлений
  const { error: showError } = useNotification();
  
  // Запрос транзакций
  const {
    data: transactionsData,
    isLoading,
    error,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['/api/v2/transactions', userId, page, limit, activeFilter],
    queryFn: async () => {
      if (!userId) return { transactions: [], total: 0 };
      
      try {
        // Use correctApiRequest for proper authentication
        const correctApiRequestModule = await import('@/lib/correctApiRequest');
        const url = `/api/v2/transactions?page=${page}&limit=${limit}${activeFilter !== 'ALL' ? `&currency=${activeFilter}` : ''}`;
        console.log('[TransactionHistory] Fetching transactions:', url);
        
        const response = await correctApiRequestModule.correctApiRequest(url, 'GET');
        console.log('[TransactionHistory] Response:', response);
        
        if (response && response.success) {
          return response.data || { transactions: [], total: 0 };
        }
        
        return { transactions: [], total: 0 };
      } catch (err) {
        console.error('[TransactionHistory] Ошибка загрузки транзакций:', err);
        return { transactions: [], total: 0 };
      }
    },
    enabled: !!userId,
    staleTime: 30000, // 30 секунд
    refetchInterval: 60000, // Обновляем каждую минуту
  });
  
  const transactions = transactionsData?.transactions || [];
  const totalTransactions = transactionsData?.total || 0;
  
  // Функции форматирования и конфигурации теперь перенесены в StyledTransactionItem
  
  // Обработчик смены фильтра
  const handleFilterChange = (filter: 'ALL' | 'UNI' | 'TON') => {
    setActiveFilter(filter);
    setPage(1); // Сбрасываем пагинацию при смене фильтра
    
    // Уведомление о смене фильтра удалено для упрощения UX
  };
  
  // Обработчик обновления данных
  const handleRefresh = () => {
    refetch();
  };
  
  // Обработчик загрузки следующей страницы
  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };
  
  if (error) {
    return (
      <div className="bg-card rounded-xl p-5 mb-5 shadow-lg">
        <div className="text-center text-red-400">
          <i className="fas fa-exclamation-triangle text-2xl mb-2"></i>
          <p>Ошибка загрузки истории транзакций</p>
          <button 
            onClick={handleRefresh}
            className="mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-5 mb-5 shadow-lg overflow-hidden relative">
      {/* Неоновая рамка */}
      <div className="absolute inset-0 rounded-xl border border-primary/30"></div>
      
      {/* Заголовок с кнопкой обновления */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <i className="fas fa-history text-primary mr-2"></i>
          История транзакций
        </h2>
        <button 
          onClick={handleRefresh}
          disabled={isFetching}
          className="text-sm text-gray-400 hover:text-primary transition-colors"
          title="Обновить историю"
        >
          <i className={`fas fa-sync-alt ${isFetching ? 'animate-spin' : ''}`}></i>
        </button>
      </div>
      
      {/* Фильтры валют */}
      <div className="flex space-x-2 mb-4 relative z-10">
        <button
          onClick={() => handleFilterChange('ALL')}
          className={`px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
            activeFilter === 'ALL'
              ? 'bg-primary text-white shadow-lg shadow-primary/25'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Все
        </button>
        <button
          onClick={() => handleFilterChange('UNI')}
          className={`px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
            activeFilter === 'UNI'
              ? 'bg-primary text-white shadow-lg shadow-primary/25'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          UNI
        </button>
        <button
          onClick={() => handleFilterChange('TON')}
          className={`px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
            activeFilter === 'TON'
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          TON
        </button>
      </div>
      
      {/* Счетчик транзакций */}
      <div className="text-xs text-gray-400 mb-3 relative z-10">
        Всего транзакций: {totalTransactions}
      </div>
      
      {/* Список транзакций */}
      <div className="space-y-3 relative z-10">
        {isLoading ? (
          // Скелетон для загрузки
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="w-24 h-4 mb-1" />
                  <Skeleton className="w-32 h-3" />
                </div>
                <div className="text-right">
                  <Skeleton className="w-16 h-4 mb-1" />
                  <Skeleton className="w-12 h-3" />
                </div>
              </div>
            </div>
          ))
        ) : transactions.length === 0 ? (
          // Пустое состояние
          <div className="text-center py-8">
            <i className="fas fa-inbox text-gray-400 text-3xl mb-3"></i>
            <p className="text-gray-400">Пока нет транзакций</p>
            <p className="text-xs text-gray-500 mt-1">
              Ваши транзакции будут отображаться здесь
            </p>
          </div>
        ) : (
          // Список транзакций с новым стилизованным компонентом
          transactions.map((transaction: any) => (
            <StyledTransactionItem 
              key={transaction.id}
              transaction={{
                id: transaction.id,
                type: transaction.type,
                amount: parseFloat(transaction.amount || '0'),
                currency: transaction.currency,
                status: transaction.status,
                description: transaction.description,
                createdAt: transaction.createdAt,
                timestamp: transaction.timestamp
              }}
            />
          ))
        )}
      </div>
      
      {/* Кнопка "Загрузить еще" */}
      {transactions.length > 0 && transactions.length < totalTransactions && (
        <div className="mt-4 text-center relative z-10">
          <button
            onClick={handleLoadMore}
            disabled={isFetching}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {isFetching ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Загрузка...
              </>
            ) : (
              'Загрузить еще'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;