import React from 'react';
import { formatAmount, formatDate } from '@/utils/formatters';
import { ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Transaction } from '@/services/transactionService';

interface TransactionItemProps {
  transaction: Transaction;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  const { type, amount, tokenType, timestamp, status, title, description } = transaction;
  
  // Определение класса для суммы (положительная/отрицательная)
  const amountClass = amount >= 0 
    ? 'text-green-500 dark:text-green-400' 
    : 'text-red-500 dark:text-red-400';
  
  // Определение типа для иконки
  const isIncoming = type.includes('deposit') || 
                    type.includes('reward') || 
                    type.includes('bonus') ||
                    type.includes('harvest');
  
  // Форматирование суммы с префиксом + для входящих
  const formattedAmount = isIncoming
    ? `+${formatAmount(amount, tokenType)}`
    : formatAmount(amount, tokenType);
  
  // Иконка в зависимости от типа
  const TransactionIcon = isIncoming ? ArrowDownLeft : ArrowUpRight;
  
  // Цвет иконки в зависимости от типа
  const iconColorClass = isIncoming 
    ? 'text-green-500 bg-green-500/10' 
    : 'text-red-500 bg-red-500/10';

  return (
    <div className="flex items-start space-x-4 rounded-md border p-4 bg-card/60 backdrop-blur-sm transition-all hover:bg-card">
      <div className={`p-2 rounded-full ${iconColorClass}`}>
        <TransactionIcon className="h-4 w-4" />
      </div>
      
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium">{title || type}</p>
            <p className="text-xs text-muted-foreground">{formatDate(timestamp)}</p>
          </div>
          
          <div className="text-right">
            <p className={`font-medium ${amountClass}`}>{formattedAmount}</p>
            
            {status && status !== 'completed' && (
              <Badge variant={status === 'pending' ? 'outline' : 'destructive'} className="text-[10px] h-5">
                {status === 'pending' ? (
                  <>
                    <Clock className="h-3 w-3 mr-1" />
                    в обработке
                  </>
                ) : (
                  'ошибка'
                )}
              </Badge>
            )}
          </div>
        </div>
        
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
};

export default TransactionItem;