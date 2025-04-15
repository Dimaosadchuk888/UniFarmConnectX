import React, { useState, useEffect } from 'react';

const ReferralLevelsTable: React.FC = () => {
  // Статические данные для таблицы с добавлением процентов выплат
  const levels = [
    { level: "Уровень 1", friends: 0, income: "0 UNI", percent: "30%" },
    { level: "Уровень 2", friends: 0, income: "0 UNI", percent: "15%" },
    { level: "Уровень 3", friends: 0, income: "0 UNI", percent: "5%" },
  ];
  
  // Состояния для анимаций и эффектов
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [visibleRows, setVisibleRows] = useState<number[]>([]);
  
  // Анимированное появление строк таблицы
  useEffect(() => {
    levels.forEach((_, index) => {
      setTimeout(() => {
        setVisibleRows(prev => [...prev, index]);
      }, 100 + index * 150);
    });
  }, []);
  
  return (
    <div className="bg-card rounded-xl p-4 shadow-lg card-hover-effect relative overflow-hidden">
      {/* Декоративный фоновый элемент */}
      <div className="absolute -right-16 -bottom-16 w-32 h-32 bg-primary/5 rounded-full blur-xl"></div>
      
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-md font-medium">Уровни партнерской программы</h2>
        
        {/* Иконка вопроса с всплывающей подсказкой */}
        <div className="relative group">
          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center cursor-pointer text-xs">
            <i className="fas fa-question"></i>
          </div>
          
          <div className="absolute right-0 top-6 w-48 bg-card p-2 rounded-md shadow-lg text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-30">
            <p className="mb-1">Процент от дохода приглашенных пользователей.</p>
            <p>Чем больше друзей, тем выше ваш доход!</p>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto relative">
        <table className="w-full">
          <thead>
            <tr className="border-b border-muted">
              <th className="py-2 text-left text-sm text-foreground opacity-70">Уровень</th>
              <th className="py-2 text-left text-sm text-foreground opacity-70">Друзей</th>
              <th className="py-2 text-left text-sm text-foreground opacity-70">Доход</th>
              <th className="py-2 text-right text-sm text-foreground opacity-70">Выплаты</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((item, index) => {
              const isVisible = visibleRows.includes(index);
              const isActive = activeRow === index;
              
              return (
                <tr 
                  key={index} 
                  className={`
                    relative
                    ${index < levels.length - 1 ? "border-b border-muted" : ""}
                    transition-all duration-300
                    ${isVisible ? 'opacity-100' : 'opacity-0'}
                    ${isActive ? 'bg-primary/5' : 'hover:bg-primary/5'}
                  `}
                  style={{
                    transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
                    transitionDelay: `${index * 100}ms`
                  }}
                  onMouseEnter={() => setActiveRow(index)}
                  onMouseLeave={() => setActiveRow(null)}
                >
                  <td className="py-3 text-sm">
                    <div className="flex items-center">
                      {/* Цветной индикатор уровня */}
                      <div 
                        className={`
                          w-2 h-2 rounded-full mr-2
                          ${index === 0 ? 'bg-primary' : index === 1 ? 'bg-indigo-400' : 'bg-indigo-300'}
                        `}
                      ></div>
                      <span 
                        className={`transition-transform duration-300 ${isActive ? 'translate-x-1' : ''}`}
                      >
                        {item.level}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-sm">{item.friends}</td>
                  <td className="py-3 text-sm text-accent">{item.income}</td>
                  <td className="py-3 text-sm text-right">
                    <span 
                      className={`
                        inline-block px-2 py-1 rounded-full text-xs
                        ${index === 0 ? 'bg-primary/20 text-primary' : 
                          index === 1 ? 'bg-primary/10 text-primary/90' : 
                                      'bg-primary/5 text-primary/80'
                        }
                        transition-all duration-300
                        ${isActive ? 'scale-110' : ''}
                      `}
                    >
                      {item.percent}
                    </span>
                  </td>
                  
                  {/* Анимированный эффект при наведении */}
                  {isActive && (
                    <td className="absolute inset-0 pointer-events-none overflow-hidden">
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0"
                        style={{
                          animation: 'pulse-fade 2s infinite',
                          animationDelay: '0.5s'
                        }}
                      ></div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Информационное сообщение */}
      <div className="mt-4 text-xs text-center text-foreground opacity-50 italic">
        Ваши партнерские уровни и доходы обновляются в реальном времени
      </div>
    </div>
  );
};

export default ReferralLevelsTable;
