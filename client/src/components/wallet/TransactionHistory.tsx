import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/contexts/userContext';
import { useNotification } from '@/contexts/NotificationContext';
import StyledTransactionItem from './StyledTransactionItem';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { fetchTransactionsV2, Transaction } from '@/services/transactionService';

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
  
  // Состояние для накопления транзакций при пагинации
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  
  // Сохраняем позицию скролла для восстановления
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  
  // Получаем данные пользователя из контекста
  const { userId } = useUser();
  
  // Получаем доступ к системе уведомлений
  const { error: showError } = useNotification();
  
  // Мемоизируем queryKey чтобы избежать лишних перезапросов
  const queryKey = useMemo(
    () => ['/api/v2/transactions', userId, page, limit, activeFilter],
    [userId, page, limit, activeFilter]
  );
  
  // Запрос транзакций
  const {
    data: transactionsData,
    isLoading,
    error,
    isFetching,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return { transactions: [], total: 0 };
      
      try {
        // Используем кешированный сервис вместо прямых API запросов
        console.log('[TransactionHistory] Запрос транзакций через кешированный сервис');
        const result = await fetchTransactionsV2(userId, page, limit, activeFilter);
        console.log('[TransactionHistory] Получено транзакций:', result.transactions.length);
        
        return result;
      } catch (err) {
        console.error('[TransactionHistory] Ошибка загрузки транзакций:', err);
        showError('Не удалось загрузить историю транзакций');
        return { transactions: [], total: 0 };
      }
    },
    enabled: !!userId,
    staleTime: 30000, // 30 секунд
    refetchInterval: 60000, // Обновляем каждую минуту
  });
  
  const transactions = transactionsData?.transactions || [];
  const totalTransactions = transactionsData?.total || 0;
  
  // Обновляем накопленные транзакции при получении новых данных
  useEffect(() => {
    // Сохраняем текущую позицию скролла перед обновлением
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop || window.scrollY;
    }
    
    if (transactions.length > 0) {
      if (page === 1) {
        // При первой странице или смене фильтра сбрасываем все транзакции
        setAllTransactions(transactions);
      } else {
        // При загрузке следующих страниц добавляем к существующим
        setAllTransactions(prev => {
          // Создаем Map для быстрой проверки дубликатов
          const existingIds = new Set(prev.map(t => t.id));
          // Добавляем только новые транзакции
          const newTransactions = transactions.filter((t: Transaction) => !existingIds.has(t.id));
          return [...prev, ...newTransactions];
        });
      }
    }
  }, [transactions, page]);
  
  // Восстанавливаем позицию скролла после рендера
  useEffect(() => {
    if (scrollPositionRef.current > 0 && !isLoading) {
      // Небольшая задержка для гарантии завершения рендера
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollPositionRef.current;
        } else {
          window.scrollTo(0, scrollPositionRef.current);
        }
      });
    }
  }, [allTransactions, isLoading]);
  
  // Функции форматирования и конфигурации теперь перенесены в StyledTransactionItem
  
  // Обработчик смены фильтра
  const handleFilterChange = (filter: 'ALL' | 'UNI' | 'TON') => {
    setActiveFilter(filter);
    setPage(1); // Сбрасываем пагинацию при смене фильтра
    setAllTransactions([]); // Очищаем накопленные транзакции
    scrollPositionRef.current = 0; // Сбрасываем позицию скролла при смене фильтра
    
    // Уведомление о смене фильтра удалено для упрощения UX
  };
  
  // Обработчик обновления данных с сохранением позиции скролла
  const handleRefresh = () => {
    // Сохраняем позицию скролла перед обновлением
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop || window.scrollY;
    }
    refetch();
  };
  
  // Обработчик загрузки следующей страницы
  const handleLoadMore = () => {
    console.log('[TransactionHistory] Загружаем следующую страницу:', page + 1);
    setPage(prev => prev + 1);
  };

  // Настройка infinite scroll
  const { targetRef, isSupported: isInfiniteScrollSupported } = useInfiniteScroll({
    hasMore: allTransactions.length < totalTransactions,
    isLoading: isFetching,
    onLoadMore: handleLoadMore,
    rootMargin: '50px'
  });
  
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
    <div 
      ref={scrollContainerRef}
      className="bg-card rounded-xl p-3 sm:p-5 mb-5 shadow-lg overflow-hidden relative">
      {/* Неоновая рамка */}
      <div className="absolute inset-0 rounded-xl border border-primary/30"></div>
      
      {/* Заголовок с кнопкой обновления */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 relative z-10">
        <h2 className="text-base sm:text-lg font-semibold text-white flex items-center">
          <i className="fas fa-history text-primary mr-2 text-sm sm:text-base"></i>
          <span className="truncate">История транзакций</span>
        </h2>
        <button 
          onClick={handleRefresh}
          disabled={isFetching}
          className="text-sm text-gray-400 hover:text-primary transition-colors p-1"
          title="Обновить историю"
        >
          <i className={`fas fa-sync-alt ${isFetching ? 'animate-spin' : ''}`}></i>
        </button>
      </div>
      
      {/* Фильтры валют - адаптивные */}
      <div className="flex flex-wrap gap-2 mb-3 sm:mb-4 relative z-10">
        <button
          onClick={() => handleFilterChange('ALL')}
          className={`px-3 py-1 rounded-lg text-xs transition-all duration-200 flex-1 sm:flex-initial min-w-[60px] ${
            activeFilter === 'ALL'
              ? 'bg-primary text-white shadow-lg shadow-primary/25'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Все
        </button>
        <button
          onClick={() => handleFilterChange('UNI')}
          className={`px-3 py-1 rounded-lg text-xs transition-all duration-200 flex-1 sm:flex-initial min-w-[60px] ${
            activeFilter === 'UNI'
              ? 'bg-primary text-white shadow-lg shadow-primary/25'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          UNI
        </button>
        <button
          onClick={() => handleFilterChange('TON')}
          className={`px-3 py-1 rounded-lg text-xs transition-all duration-200 flex-1 sm:flex-initial min-w-[60px] ${
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
        ) : allTransactions.length === 0 ? (
          // Пустое состояние
          <div className="text-center py-8">
            <i className="fas fa-inbox text-gray-400 text-3xl mb-3"></i>
            <p className="text-gray-400">Пока нет транзакций</p>
            <p className="text-xs text-gray-500 mt-1">
              Ваши транзакции будут отображаться здесь
            </p>
          </div>
        ) : (
          // Список транзакций с плавными анимациями
          <>
            {allTransactions.map((transaction: any, index: number) => (
              <div
                key={transaction.id}
                className="animate-fadeInUp"
                style={{
                  // Ограничиваем анимацию только первыми 10 элементами для производительности
                  animationDelay: index < 10 ? `${index * 50}ms` : '0ms',
                  animationDuration: index < 10 ? '0.4s' : '0s',
                  animationFillMode: 'both'
                }}
              >
                <StyledTransactionItem 
                  transaction={{
                    id: transaction.id,
                    type: transaction.type,
                    amount: parseFloat(transaction.amount || '0'),
                    currency: transaction.currency,
                    status: transaction.status,
                    description: transaction.description,
                    createdAt: transaction.createdAt || transaction.created_at,
                    timestamp: transaction.timestamp || transaction.created_at
                  }}
                />
              </div>
            ))}
            
            {/* Loading skeleton для подгружающихся элементов */}
            {isFetching && allTransactions.length > 0 && (
              <>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={`loading-skeleton-${index}`} className="bg-gray-800/30 rounded-lg p-3 animate-pulse">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                      <div className="flex-1">
                        <div className="w-24 h-4 bg-gray-700 rounded mb-1"></div>
                        <div className="w-32 h-3 bg-gray-700 rounded"></div>
                      </div>
                      <div className="text-right">
                        <div className="w-16 h-4 bg-gray-700 rounded mb-1"></div>
                        <div className="w-12 h-3 bg-gray-700 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
      
      {/* Infinite scroll trigger или fallback кнопка */}
      {allTransactions.length > 0 && allTransactions.length < totalTransactions && (
        isInfiniteScrollSupported ? (
          // Invisible trigger для infinite scroll
          <div 
            ref={targetRef}
            className="h-16 flex items-center justify-center mt-4 relative z-10"
          >
            {isFetching && (
              <div className="flex items-center text-gray-400 text-sm animate-pulse">
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Загружаем еще транзакции...
              </div>
            )}
          </div>
        ) : (
          // Fallback кнопка для браузеров без IntersectionObserver
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
        )
      )}
    </div>
  );
};

export default TransactionHistory;