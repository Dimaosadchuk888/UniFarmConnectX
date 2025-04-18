import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

// Типы для транзакций из БД
interface DbTransaction {
  id: number;
  user_id: number;
  type: string; // deposit / withdraw / reward / farming / bonus / purchase
  currency: string; // UNI / TON
  amount: string; // строка, потому что numeric из PostgreSQL
  status: string; // pending / confirmed / rejected
  created_at: string; // строка с датой
  source?: string; // Источник транзакции (например, "TON Boost", "UNI Farming")
  category?: string; // Категория транзакции (например, "farming", "bonus", "purchase")
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
  source?: string;
  category?: string;
}

const TransactionHistory: React.FC = () => {
  // Состояние для активного фильтра
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNI' | 'TON'>('ALL');
  
  // ID текущего пользователя (в реальном приложении должен быть получен из контекста аутентификации)
  const currentUserId = 1; // Для примера используем ID = 1
  
  console.log("[DEBUG] TransactionHistory - User ID:", currentUserId);
  
  console.log("[DEBUG] TransactionHistory - Starting API request for transactions");

  // Интерфейс для структуры ответа API
  interface ApiResponseData {
    total: number;
    transactions: DbTransaction[];
  }
  
  interface ApiResponse {
    success: boolean;
    data: ApiResponseData;
  }

  // Используем стандартный запрос через queryClient
  const { data: apiResponse, isLoading, error } = useQuery<ApiResponse>({
    queryKey: [`/api/transactions?user_id=${currentUserId}`],
    staleTime: 15000,
  });
  
  // Добавляем логирование полученных данных
  React.useEffect(() => {
    if (apiResponse) {
      console.log("[DEBUG] TransactionHistory - API request succeeded:", { 
        success: apiResponse.success,
        transactionsCount: apiResponse.data?.transactions?.length || 0,
        sample: apiResponse.data?.transactions?.slice(0, 2) || [],
        time: new Date().toISOString()
      });
    }
  }, [apiResponse]);
  
  // Проверяем, успешно ли получены данные и есть ли они
  const hasData = apiResponse !== undefined && apiResponse !== null;
  const hasTransactions = hasData && apiResponse.success === true && 
                          Array.isArray(apiResponse.data?.transactions) && 
                          apiResponse.data.transactions.length > 0;
  const isEmptyResult = hasData && apiResponse.success === true && 
                         Array.isArray(apiResponse.data?.transactions) && 
                         apiResponse.data.transactions.length === 0;
  
  // Получаем транзакции из ответа API или используем пустой массив
  const dbTransactions = apiResponse?.data?.transactions || [];
  
  // Преобразуем данные из БД в формат для UI с проверкой на ошибки и отсутствующие данные
  const transactions: Transaction[] = Array.isArray(dbTransactions) ? dbTransactions.map(tx => {
    if (!tx) return null; // Проверка на null/undefined элементы в массиве
    
    // Определяем заголовок в зависимости от типа транзакции или категории
    let title = '';
    // Используем новое поле category, если оно доступно
    if (tx.category === 'farming' || tx.type === 'farming') {
      title = tx.source ? `Доход от ${tx.source}` : 'Доход от фарминга';
    } else if (tx.category === 'bonus' || tx.type === 'bonus') {
      title = tx.source ? `Бонус от ${tx.source}` : 'Бонусное начисление';
    } else if (tx.category === 'purchase' || tx.type === 'purchase') {
      title = tx.source ? `Покупка ${tx.source}` : 'Покупка';
    } else if (tx.type === 'reward') {
      title = 'Награда за миссию';
    } else if (tx.type === 'deposit') {
      title = 'Пополнение';
    } else if (tx.type === 'withdraw') {
      title = 'Вывод средств';
    } else {
      title = 'Транзакция';
    }
    
    // Добавляем логирование для отладки
    console.log("[DEBUG] Transaction data:", {
      id: tx.id,
      type: tx.type,
      category: tx.category,
      source: tx.source,
      currency: tx.currency,
      amount: tx.amount
    });
    
    try {
      return {
        id: tx.id || Math.random().toString(36).substring(2, 9), // Генерация ID, если его нет
        type: tx.category || tx.type || 'unknown', // Предпочитаем использовать category, если доступно
        title: title,
        amount: typeof tx.amount === 'string' ? parseFloat(tx.amount) : (tx.amount || 0),
        tokenType: tx.currency || 'UNI',
        timestamp: tx.created_at ? new Date(tx.created_at) : new Date(),
        status: tx.status || 'confirmed',
        source: tx.source,
        category: tx.category
      };
    } catch (e) {
      console.error('Error processing transaction data:', e);
      return null; // В случае ошибки пропускаем транзакцию
    }
  }).filter(Boolean) as Transaction[] : []; // Фильтруем null значения
  
  // Форматирование даты в нужный формат с защитой от Invalid Date
  const formatDate = (date: Date): string => {
    try {
      // Проверка на валидность даты
      if (isNaN(date.getTime())) {
        return 'Только что';
      }

      const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day} ${month}., ${hours}:${minutes}`;
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Только что';
    }
  };
  
  // Форматирование суммы транзакции с защитой от ошибок
  const formatAmount = (amount: number, tokenType: string, type?: string): string => {
    try {
      // Проверяем, что amount является числом
      if (typeof amount !== 'number' || isNaN(amount)) {
        return `+0.00000 ${tokenType || 'UNI'}`;
      }
      
      // Знак для суммы (покупки показываем как отрицательные)
      const sign = type === 'purchase' ? '-' : '+';
      
      // Защита от отрицательных значений (для наград всегда положительный знак)
      const absoluteAmount = Math.abs(amount);
      
      // Для транзакций связанных с фармингом TON, используем 6 знаков после запятой 
      // чтобы отображать микро-суммы
      if ((type === 'farming' || type === 'boost_farming') && tokenType === 'TON') {
        // Для очень маленьких сумм TON используем фиксированное количество знаков
        // чтобы предотвратить округление до нуля
        const formattedTON = absoluteAmount.toFixed(6);
        return `${sign}${formattedTON} ${tokenType}`;
      }
      
      // Для UNI транзакций
      if (tokenType === 'UNI') {
        // Используем больше цифр для отображения дробной части (до 8 знаков)
        let formattedAmount;
        
        // Если число целое, убираем десятичную часть
        if (Number.isInteger(absoluteAmount)) {
          formattedAmount = absoluteAmount.toString();
        } 
        // Иначе используем форматирование с 8 знаками для микро-сумм
        else {
          formattedAmount = absoluteAmount.toLocaleString('en-US', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 8
          }).replace(/\.?0+$/, '');
        }
        
        return `${sign}${formattedAmount} ${tokenType}`;
      }
      
      // Для TON и других типов транзакций используем стандартное форматирование
      let formattedAmount = absoluteAmount.toFixed(5);
      
      // Если число целое, убираем десятичную часть
      if (Number.isInteger(absoluteAmount)) {
        formattedAmount = absoluteAmount.toString();
      } 
      // Если число не целое, убираем лишние нули в конце
      else if (formattedAmount.includes('.')) {
        formattedAmount = absoluteAmount.toLocaleString('en-US', {
          minimumFractionDigits: 1,
          maximumFractionDigits: tokenType === 'TON' ? 6 : 5
        }).replace(/\.?0+$/, '');
      }
      
      return `${sign}${formattedAmount} ${tokenType || 'UNI'}`;
    } catch (e) {
      console.error('Error formatting amount:', e);
      return `+0.00000 ${tokenType || 'UNI'}`;
    }
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
            // Отображение ошибки при сбое запроса
            <div className="py-6 text-center text-red-500">
              <i className="fas fa-exclamation-triangle mb-2 text-2xl"></i>
              <p>Ошибка загрузки транзакций</p>
            </div>
          ) : isEmptyResult ? (
            // Отображение пустого результата, когда transactions = []
            <div className="py-8 text-center text-gray-500">
              <i className="fas fa-wallet mb-3 text-3xl"></i>
              <p className="text-lg">У вас пока нет транзакций</p>
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
                      <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-sm">
                        {transaction.source || transaction.type}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Сумма транзакции */}
                <div className={`px-2 py-1 rounded ${transaction.tokenType === 'UNI' ? 'bg-green-500/10 text-green-400' : 'bg-cyan-500/10 text-cyan-400'} font-medium text-sm`}>
                  {formatAmount(transaction.amount, transaction.tokenType, transaction.type)}
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