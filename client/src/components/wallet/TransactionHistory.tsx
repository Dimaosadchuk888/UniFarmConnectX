import React, { useState } from 'react';

// Типы для транзакций
type TransactionType = 'farming';
type TokenType = 'UNI' | 'TON';

interface Transaction {
  id: string;
  type: TransactionType;
  title: string;
  amount: number;
  tokenType: TokenType;
  timestamp: Date;
}

// Имитация данных транзакций
const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'farming',
    title: 'Доход от фарминга',
    amount: 0.00600000,
    tokenType: 'UNI',
    timestamp: new Date(2025, 3, 15, 13, 12) // 15 апреля 2025, 13:12
  },
  {
    id: '2',
    type: 'farming',
    title: 'Доход от фарминга',
    amount: 0.00450000,
    tokenType: 'UNI',
    timestamp: new Date(2025, 3, 15, 11, 45) // 15 апреля 2025, 11:45
  },
  {
    id: '3',
    type: 'farming',
    title: 'Доход от фарминга',
    amount: 0.00000131,
    tokenType: 'TON',
    timestamp: new Date(2025, 3, 15, 10, 30) // 15 апреля 2025, 10:30
  },
  {
    id: '4',
    type: 'farming',
    title: 'Доход от фарминга',
    amount: 0.00520000,
    tokenType: 'UNI',
    timestamp: new Date(2025, 3, 14, 19, 22) // 14 апреля 2025, 19:22
  },
  {
    id: '5',
    type: 'farming',
    title: 'Доход от фарминга',
    amount: 0.00000118,
    tokenType: 'TON',
    timestamp: new Date(2025, 3, 14, 16, 45) // 14 апреля 2025, 16:45
  },
  {
    id: '6',
    type: 'farming',
    title: 'Доход от фарминга',
    amount: 0.00380000,
    tokenType: 'UNI',
    timestamp: new Date(2025, 3, 14, 13, 15) // 14 апреля 2025, 13:15
  },
  {
    id: '7',
    type: 'farming',
    title: 'Доход от фарминга',
    amount: 0.00000095,
    tokenType: 'TON',
    timestamp: new Date(2025, 3, 13, 21, 10) // 13 апреля 2025, 21:10
  },
  {
    id: '8',
    type: 'farming',
    title: 'Доход от фарминга',
    amount: 0.00410000,
    tokenType: 'UNI',
    timestamp: new Date(2025, 3, 13, 18, 30) // 13 апреля 2025, 18:30
  },
  {
    id: '9',
    type: 'farming',
    title: 'Доход от фарминга',
    amount: 0.00000110,
    tokenType: 'TON',
    timestamp: new Date(2025, 3, 13, 16, 20) // 13 апреля 2025, 16:20
  },
  {
    id: '10',
    type: 'farming',
    title: 'Доход от фарминга',
    amount: 0.00350000,
    tokenType: 'UNI',
    timestamp: new Date(2025, 3, 13, 14, 45) // 13 апреля 2025, 14:45
  }
];

const TransactionHistory: React.FC = () => {
  // Состояние для активного фильтра
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNI' | 'TON'>('ALL');
  
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
  const formatAmount = (amount: number, tokenType: TokenType): string => {
    return `+${amount.toFixed(8)} ${tokenType}`;
  };
  
  // Фильтрация транзакций
  const filteredTransactions = mockTransactions.filter(transaction => {
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
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map(transaction => (
              <div 
                key={transaction.id}
                className="flex items-center justify-between py-3 border-b border-gray-800/50 hover:bg-black/20 transition-colors duration-200 px-2 rounded-md"
              >
                <div className="flex items-center">
                  {/* Иконка транзакции */}
                  <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center mr-3">
                    <i className="fas fa-link text-amber-400"></i>
                  </div>
                  
                  <div>
                    {/* Название и тип транзакции */}
                    <p className="text-white text-sm font-medium">{transaction.title}</p>
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