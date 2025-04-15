import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

// Типы для транзакций из БД
interface DbTransaction {
  id: number;
  user_id: number;
  type: string; // deposit / withdraw / reward
  currency: string; // UNI / TON
  amount: string; // строка, потому что numeric из PostgreSQL
  status: string; // pending / confirmed / rejected
  created_at: string; // строка с датой
}

// Тип для отображения на фронтенде
interface Transaction {
  id: string | number;
  type: string;
  title: string;
  amount: number;
  tokenType: string;
  timestamp: Date;
  status: string;
}

const TransactionHistory: React.FC = () => {
  // Состояние для активного фильтра
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNI' | 'TON'>('ALL');
  
  // ID текущего пользователя (в реальном приложении должен быть получен из контекста аутентификации)
  const currentUserId = 1; // Для примера используем ID = 1
  
  // Запрос на получение транзакций пользователя
  const { data: dbTransactions, isLoading, error } = useQuery<DbTransaction[]>({
    queryKey: ['/api/transactions', currentUserId],
    queryFn: async () => {
      const response = await fetch(`/api/transactions?user_id=${currentUserId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return response.json();
    }
  });
  
  // Преобразуем данные из БД в формат для UI
  const transactions: Transaction[] = dbTransactions ? dbTransactions.map(tx => {
    // Определяем заголовок в зависимости от типа транзакции
    let title = '';
    if (tx.type === 'farming') title = 'Доход от фарминга';
    else if (tx.type === 'reward') title = 'Награда за миссию';
    else if (tx.type === 'deposit') title = 'Пополнение';
    else if (tx.type === 'withdraw') title = 'Вывод средств';
    else title = 'Транзакция';
    
    return {
      id: tx.id,
      type: tx.type,
      title: title,
      amount: parseFloat(tx.amount),
      tokenType: tx.currency,
      timestamp: new Date(tx.created_at),
      status: tx.status
    };
  }) : [];
  
  // Форматирование даты в нужный формат
  const formatDate = (date: Date): string => {
    const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day} ${month}., ${hours}:${minutes}`;
  };
  
  // Форматирование суммы транзакции
  const formatAmount = (amount: number, tokenType: string): string => {
    return `+${amount.toFixed(8)} ${tokenType}`;
  };
  
  // Фильтрация транзакций
  const filteredTransactions = transactions.filter(transaction => {
    if (activeFilter === 'ALL') return true;
    return transaction.tokenType === activeFilter;
  });
  
  return (
    <div className="bg-card rounded-xl p-5 mb-5 shadow-lg overflow-hidden relative">
      {/* Декоративный градиентный фон */}
      <div 
        className="absolute inset-0 opacity-20 z-0" 
        style={{
          background: 'radial-gradient(circle at 10% 20%, rgba(162, 89, 255, 0.2) 0%, transparent 70%), radial-gradient(circle at 80% 70%, rgba(92, 120, 255, 0.2) 0%, transparent 70%)'
        }}
      ></div>
      
      {/* Неоновая рамка */}
      <div className="absolute inset-0 rounded-xl border border-primary/30"></div>
      
      {/* Заголовок и фильтры */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 relative z-10">
        <h2 className="text-lg font-semibold text-white flex items-center mb-3 md:mb-0">
          <i className="fas fa-history text-primary mr-2"></i>
          История транзакций
        </h2>
        
        {/* Фильтры */}
        <div className="flex rounded-lg bg-black/30 p-0.5">
          <button 
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${activeFilter === 'ALL' ? 'bg-primary/80 text-white' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveFilter('ALL')}
          >
            Все
          </button>
          <button 
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${activeFilter === 'UNI' ? 'bg-green-600/80 text-white' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveFilter('UNI')}
          >
            UNI
          </button>
          <button 
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${activeFilter === 'TON' ? 'bg-cyan-600/80 text-white' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveFilter('TON')}
          >
            TON
          </button>
        </div>
      </div>
      
      {/* Скролл контейнер с маской затухания */}
      <div className="relative overflow-hidden">
        {/* Эффект затухания вверху */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none"></div>
        
        {/* Эффект затухания внизу */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent z-10 pointer-events-none"></div>
        
        {/* Скроллируемый контейнер */}
        <div className="max-h-[350px] overflow-y-auto scrollbar-none relative z-0 pr-1">
          {isLoading ? (
            // Скелетон загрузки
            Array(5).fill(0).map((_, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-800/50 px-2">
                <div className="flex items-center">
                  <Skeleton className="w-9 h-9 rounded-full bg-gray-800/50 mr-3" />
                  <div>
                    <Skeleton className="w-32 h-4 bg-gray-800/50 mb-2" />
                    <Skeleton className="w-24 h-3 bg-gray-800/50" />
                  </div>
                </div>
                <Skeleton className="w-20 h-7 bg-gray-800/50" />
              </div>
            ))
          ) : error ? (
            // Отображение ошибки
            <div className="py-6 text-center text-red-500">
              <i className="fas fa-exclamation-triangle mb-2 text-2xl"></i>
              <p>Ошибка загрузки транзакций</p>
            </div>
          ) : filteredTransactions.length > 0 ? (
            // Отображение транзакций
            filteredTransactions.map((transaction, index) => (
              <div 
                key={transaction.id}
                className="flex items-center justify-between py-3 border-b border-gray-800/50 hover:bg-black/20 transition-all duration-300 px-2 rounded-md animate-fadeIn"
              >
                <div className="flex items-center">
                  {/* Иконка транзакции в зависимости от типа токена */}
                  <div className={`w-9 h-9 rounded-full ${transaction.tokenType === 'UNI' ? 'bg-green-500/20' : 'bg-cyan-500/20'} flex items-center justify-center mr-3 transition-all duration-300`}>
                    <i className={`fas ${transaction.tokenType === 'UNI' ? 'fa-leaf text-green-400' : 'fa-tenge text-cyan-400'}`}></i>
                  </div>
                  
                  <div>
                    {/* Название и тип транзакции */}
                    <div className="flex items-center">
                      <p className="text-white text-sm font-medium">{transaction.title}</p>
                      {/* Индикатор новых транзакций (для первых двух) */}
                      {index < 2 && (
                        <span className="ml-2 text-[10px] bg-purple-600/80 text-white px-1.5 py-0.5 rounded animate-pulseGlow">Новая</span>
                      )}
                    </div>
                    <div className="flex items-center mt-0.5">
                      <span className="text-xs text-gray-500 mr-2">{formatDate(transaction.timestamp)}</span>
                      <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-sm">{transaction.type}</span>
                    </div>
                  </div>
                </div>
                
                {/* Сумма транзакции */}
                <div className={`px-2 py-1 rounded ${transaction.tokenType === 'UNI' ? 'bg-green-500/10 text-green-400' : 'bg-cyan-500/10 text-cyan-400'} font-medium text-sm`}>
                  {formatAmount(transaction.amount, transaction.tokenType)}
                </div>
              </div>
            ))
          ) : (
            // Пустое состояние
            <div className="py-6 text-center text-gray-500">
              <i className="fas fa-search mb-2 text-2xl"></i>
              <p>Транзакции не найдены</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;