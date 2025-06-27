import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/contexts/userContext';
import { useNotification } from '@/contexts/notificationContext';
import { format } from 'date-fns';
import { FiCalendar, FiDownload, FiFilter, FiRefreshCw } from 'react-icons/fi';

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
  // Расширенные фильтры
  const [filters, setFilters] = useState({
    currency: 'ALL' as 'ALL' | 'UNI' | 'TON',
    type: 'ALL' as 'ALL' | 'deposit' | 'withdrawal' | 'farming_reward' | 'referral_bonus' | 'mission_reward' | 'boost_purchase',
    status: 'ALL' as 'ALL' | 'pending' | 'completed' | 'failed' | 'cancelled',
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
    amountMin: '',
    amountMax: ''
  });
  
  // Состояние для пагинации
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  
  // Состояние для экспорта
  const [isExporting, setIsExporting] = useState(false);
  
  // Получаем данные пользователя из контекста
  const { userId } = useUser();
  
  // Получаем доступ к системе уведомлений
  const { showNotification } = useNotification();
  
  // Функция экспорта CSV
  const exportToCSV = () => {
    if (!transactions.length) {
      showNotification('error', { message: 'Нет данных для экспорта' });
      return;
    }
    
    setIsExporting(true);
    
    try {
      const csvHeaders = 'Дата,Тип,Сумма,Валюта,Статус,Описание\n';
      const csvData = transactions.map((transaction: Transaction) => {
        const date = format(new Date(transaction.created_at), 'dd.MM.yyyy HH:mm');
        const type = getTransactionTypeText(transaction.type);
        const amount = parseFloat(transaction.amount).toFixed(6);
        const currency = transaction.currency;
        const status = getStatusText(transaction.status);
        const description = transaction.description || '';
        
        return `"${date}","${type}","${amount}","${currency}","${status}","${description}"`;
      }).join('\n');
      
      const csvContent = csvHeaders + csvData;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `UniFarm_Transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      showNotification('success', { message: 'Экспорт завершен успешно' });
    } catch (error) {
      showNotification('error', { message: 'Ошибка при экспорте данных' });
    } finally {
      setIsExporting(false);
    }
  };

  // Запрос транзакций
  const {
    data: transactionsData,
    isLoading,
    error,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['/api/transactions', userId, page, limit, filters],
    queryFn: async () => {
      if (!userId) return { transactions: [], total: 0 };
      
      try {
        const response = await fetch(`/api/transactions?user_id=${userId}&page=${page}&limit=${limit}&currency=${filters.currency !== 'ALL' ? filters.currency : ''}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
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

  // Вспомогательные функции форматирования
  const getTransactionTypeText = (type: Transaction['type']): string => {
    switch (type) {
      case 'deposit':
        return 'Пополнение';
      case 'withdrawal':
        return 'Вывод средств';
      case 'farming_reward':
        return 'Награда за фарминг';
      case 'referral_bonus':
        return 'Реферальный бонус';
      case 'mission_reward':
        return 'Награда за миссию';
      case 'boost_purchase':
        return 'Покупка буста';
      default:
        return 'Операция';
    }
  };

  const getStatusText = (status: Transaction['status']): string => {
    switch (status) {
      case 'pending':
        return 'В ожидании';
      case 'completed':
        return 'Завершено';
      case 'failed':
        return 'Неудача';
      case 'cancelled':
        return 'Отменено';
      default:
        return 'Неизвестно';
    }
  };
  
  // Форматирование даты и времени
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Форматирование суммы транзакции
  const formatTransactionAmount = (amount: string, currency: string): string => {
    const num = parseFloat(amount);
    if (currency === 'TON') {
      return num.toFixed(6);
    } else {
      return num.toFixed(2);
    }
  };
  
  // Получение иконки для типа транзакции
  const getTransactionIcon = (type: string): string => {
    switch (type) {
      case 'deposit':
        return 'fas fa-arrow-down text-green-400';
      case 'withdrawal':
        return 'fas fa-arrow-up text-red-400';
      case 'farming_reward':
        return 'fas fa-seedling text-yellow-400';
      case 'referral_bonus':
        return 'fas fa-users text-blue-400';
      case 'mission_reward':
        return 'fas fa-trophy text-purple-400';
      case 'boost_purchase':
        return 'fas fa-rocket text-orange-400';
      default:
        return 'fas fa-exchange-alt text-gray-400';
    }
  };
  
  // Получение цвета для статуса транзакции
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-400/10';
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'failed':
        return 'text-red-400 bg-red-400/10';
      case 'cancelled':
        return 'text-gray-400 bg-gray-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };
  

  
  // Получение описания типа транзакции на русском
  const getTypeDescription = (type: string): string => {
    switch (type) {
      case 'deposit':
        return 'Пополнение';
      case 'withdrawal':
        return 'Вывод средств';
      case 'farming_reward':
        return 'Награда за фарминг';
      case 'referral_bonus':
        return 'Реферальный бонус';
      case 'mission_reward':
        return 'Награда за миссию';
      case 'boost_purchase':
        return 'Покупка буста';
      default:
        return 'Операция';
    }
  };
  
  // Обработчик смены фильтра валюты
  const handleCurrencyFilterChange = (currency: 'ALL' | 'UNI' | 'TON') => {
    setFilters(prev => ({ ...prev, currency }));
    setPage(1); // Сбрасываем пагинацию при смене фильтра
    
    showNotification('info', { message: `Фильтр изменен на ${currency === 'ALL' ? 'Все валюты' : currency}` });
  };
  
  // Обработчик очистки всех фильтров
  const clearAllFilters = () => {
    setFilters({
      currency: 'ALL',
      type: 'ALL',
      status: 'ALL',
      dateFrom: null,
      dateTo: null,
      amountMin: '',
      amountMax: ''
    });
    setPage(1);
    showNotification('info', { message: 'Все фильтры очищены' });
  };
  
  // Обработчик обновления данных
  const handleRefresh = () => {
    showNotification('loading', {
      message: 'Обновление истории транзакций...',
      duration: 1500
    });
    
    refetch().then(() => {
      showNotification('success', {
        message: 'История транзакций обновлена',
        duration: 2000
      });
    });
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
      
      {/* Расширенные фильтры */}
      <div className="space-y-4 mb-6 relative z-10">
        {/* Основные фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Фильтр валюты */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Валюта</label>
            <Select 
              value={filters.currency} 
              onValueChange={(value: 'ALL' | 'UNI' | 'TON') => 
                setFilters(prev => ({ ...prev, currency: value }))
              }
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Все валюты</SelectItem>
                <SelectItem value="UNI">UNI</SelectItem>
                <SelectItem value="TON">TON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Фильтр типа */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Тип операции</label>
            <Select 
              value={filters.type} 
              onValueChange={(value: typeof filters.type) => 
                setFilters(prev => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Все типы</SelectItem>
                <SelectItem value="deposit">Пополнение</SelectItem>
                <SelectItem value="withdrawal">Вывод</SelectItem>
                <SelectItem value="farming_reward">Награда за фарминг</SelectItem>
                <SelectItem value="referral_bonus">Реферальный бонус</SelectItem>
                <SelectItem value="mission_reward">Награда за миссию</SelectItem>
                <SelectItem value="boost_purchase">Покупка буста</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Фильтр статуса */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Статус</label>
            <Select 
              value={filters.status} 
              onValueChange={(value: typeof filters.status) => 
                setFilters(prev => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Все статусы</SelectItem>
                <SelectItem value="pending">В ожидании</SelectItem>
                <SelectItem value="completed">Завершено</SelectItem>
                <SelectItem value="failed">Неудача</SelectItem>
                <SelectItem value="cancelled">Отменено</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Дополнительные фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Сумма от</label>
              <Input
                type="number"
                placeholder="0.000"
                value={filters.amountMin}
                onChange={(e) => setFilters(prev => ({ ...prev, amountMin: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Сумма до</label>
              <Input
                type="number"
                placeholder="999999.999"
                value={filters.amountMax}
                onChange={(e) => setFilters(prev => ({ ...prev, amountMax: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={clearAllFilters}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <FiFilter className="w-4 h-4 mr-2" />
            Очистить фильтры
          </Button>
          
          <Button
            onClick={exportToCSV}
            disabled={isExporting || !transactions.length}
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-white"
          >
            <FiDownload className="w-4 h-4 mr-2" />
            {isExporting ? 'Экспорт...' : 'Экспорт CSV'}
          </Button>
          
          <Button
            onClick={() => refetch()}
            disabled={isFetching}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <FiRefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
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
          // Список транзакций
          transactions.map((transaction: Transaction) => (
            <div 
              key={transaction.id}
              className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 hover:border-primary/30 transition-all duration-200 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                {/* Левая часть - иконка и информация */}
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center">
                    <i className={`${getTransactionIcon(transaction.type)} text-sm`}></i>
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">
                      {getTypeDescription(transaction.type)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDateTime(transaction.created_at)}
                    </div>
                    {transaction.description && (
                      <div className="text-xs text-gray-500 mt-1">
                        {transaction.description}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Правая часть - сумма и статус */}
                <div className="text-right">
                  <div className="text-white font-medium">
                    {transaction.type === 'withdrawal' ? '-' : '+'}
                    {formatTransactionAmount(transaction.amount, transaction.currency)} {transaction.currency}
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-md inline-block mt-1 ${getStatusColor(transaction.status)}`}>
                    {getStatusText(transaction.status)}
                  </div>
                  {transaction.transaction_hash && (
                    <div className="text-xs text-gray-500 mt-1">
                      {transaction.transaction_hash.substring(0, 8)}...
                    </div>
                  )}
                </div>
              </div>
            </div>
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