import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/contexts/userContext';
import { useNotification } from '@/contexts/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Filter, Search, ArrowUpRight, ArrowDownLeft, Clock, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatUniNumber, formatTonNumber, formatDate } from '@/utils/formatters';
import { correctApiRequest } from '@/lib/queryClient';

/**
 * УНИФИЦИРОВАННЫЙ КОМПОНЕНТ ИСТОРИИ ТРАНЗАКЦИЙ
 * Объединяет все дублирующие реализации отображения транзакций
 * Рефакторинг по рекомендациям: docs/UNIFARM_CENTRALIZATION_AUDIT_REPORT.md
 * 
 * ЗАМЕНЯЕТ:
 * - client/src/components/wallet/TransactionHistory.tsx (основная реализация)
 * - client/src/components/wallet/TransactionItem.tsx (элемент транзакции)
 * - Дублирующие компоненты транзакций в других модулях
 */

interface Transaction {
  id: number;
  type: string;
  amount: number;
  currency: 'UNI' | 'TON';
  status: 'pending' | 'completed' | 'failed' | 'confirmed';
  description: string;
  createdAt: string;
  timestamp: number;
}

interface UnifiedTransactionHistoryProps {
  variant?: 'full' | 'compact' | 'minimal';
  showFilters?: boolean;
  showSearch?: boolean;
  maxItems?: number;
  className?: string;
  title?: string;
  autoRefresh?: boolean;
}

export const UnifiedTransactionHistory: React.FC<UnifiedTransactionHistoryProps> = ({
  variant = 'full',
  showFilters = true,
  showSearch = true,
  maxItems = 50,
  className = '',
  title = 'История транзакций',
  autoRefresh = false
}) => {
  const { user } = useUser();
  const { addNotification } = useNotification();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCurrency, setFilterCurrency] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Загрузка транзакций
  const loadTransactions = useCallback(async (page = 1, append = false) => {
    if (!user?.id || loading) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        user_id: user.id.toString(),
        page: page.toString(),
        limit: maxItems.toString()
      });

      if (filterCurrency !== 'all') {
        params.append('currency', filterCurrency);
      }

      const response = await correctApiRequest(`/api/v2/transactions?${params}`);
      
      if (response.success && response.data) {
        const newTransactions = response.data.transactions || [];
        
        if (append) {
          setTransactions(prev => [...prev, ...newTransactions]);
        } else {
          setTransactions(newTransactions);
        }
        
        setHasMore(response.data.hasMore || false);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Ошибка загрузки транзакций:', error);
      addNotification({
        type: 'error',
        message: 'Ошибка загрузки истории транзакций',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, loading, maxItems, filterCurrency, addNotification]);

  // Автоматическое обновление
  useEffect(() => {
    loadTransactions(1, false);
  }, [loadTransactions]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadTransactions(1, false);
    }, 30000); // Обновление каждые 30 секунд

    return () => clearInterval(interval);
  }, [autoRefresh, loadTransactions]);

  // Фильтрация транзакций
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = searchTerm === '' || 
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || tx.type === filterType;
    
    return matchesSearch && matchesType;
  });

  // Загрузка следующей страницы
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadTransactions(currentPage + 1, true);
    }
  }, [hasMore, loading, currentPage, loadTransactions]);

  // Обновление списка
  const refresh = useCallback(() => {
    loadTransactions(1, false);
  }, [loadTransactions]);

  // Получение иконки для типа транзакции
  const getTransactionIcon = (type: string, currency: string) => {
    const isIncome = type.includes('reward') || type.includes('bonus') || type.includes('income');
    
    if (currency === 'TON') {
      return isIncome ? '💎↗️' : '💎↙️';
    } else {
      return isIncome ? '🌾↗️' : '🌾↙️';
    }
  };

  // Получение цвета для статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Форматирование суммы
  const formatAmount = (amount: number, currency: string) => {
    return currency === 'UNI' ? formatUniNumber(amount) : formatTonNumber(amount);
  };

  // Рендер элемента транзакции
  const renderTransactionItem = (transaction: Transaction, isCompact = false) => (
    <div key={transaction.id} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        <div className="text-lg">
          {getTransactionIcon(transaction.type, transaction.currency)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium truncate">
              {transaction.description}
            </p>
            <Badge className={`text-xs ${getStatusColor(transaction.status)}`}>
              {transaction.status}
            </Badge>
          </div>
          
          {!isCompact && (
            <p className="text-xs text-muted-foreground">
              {formatDate(transaction.createdAt)}
            </p>
          )}
        </div>
      </div>
      
      <div className="text-right">
        <div className="text-sm font-medium">
          {formatAmount(transaction.amount, transaction.currency)} {transaction.currency}
        </div>
        {isCompact && (
          <div className="text-xs text-muted-foreground">
            {new Date(transaction.createdAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );

  // Рендер минимальной версии
  if (variant === 'minimal') {
    return (
      <div className={`space-y-2 ${className}`}>
        {filteredTransactions.slice(0, 3).map(tx => (
          <div key={tx.id} className="flex items-center justify-between text-sm">
            <span className="truncate">{tx.description}</span>
            <span className="font-medium">
              {formatAmount(tx.amount, tx.currency)} {tx.currency}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Рендер компактной версии
  if (variant === 'compact') {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{title}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-1">
              {filteredTransactions.slice(0, 6).map(tx => renderTransactionItem(tx, true))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  // Рендер полной версии
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>

        {/* Фильтры и поиск */}
        {(showFilters || showSearch) && (
          <div className="space-y-3 pt-3">
            {showSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск транзакций..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}

            {showFilters && (
              <div className="flex gap-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    <SelectItem value="FARMING_REWARD">Доход с фарминга</SelectItem>
                    <SelectItem value="REFERRAL_REWARD">Реферальный бонус</SelectItem>
                    <SelectItem value="DAILY_BONUS">Ежедневный бонус</SelectItem>
                    <SelectItem value="deposit">Депозит</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterCurrency} onValueChange={setFilterCurrency}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Валюта" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="UNI">UNI</SelectItem>
                    <SelectItem value="TON">TON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-96">
          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || filterType !== 'all' 
                  ? 'Транзакции не найдены' 
                  : 'Нет транзакций'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTransactions.map(tx => renderTransactionItem(tx, false))}
              
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Загрузка...
                      </>
                    ) : (
                      'Загрузить еще'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default UnifiedTransactionHistory;