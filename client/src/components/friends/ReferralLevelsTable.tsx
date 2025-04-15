import React, { useState, useEffect, useRef } from 'react';

const ReferralLevelsTable: React.FC = () => {
  // Статические данные для таблицы с 20 уровнями согласно запросу
  const levels = [
    { level: "Уровень 1", friends: 0, income: "0 UNI", percent: "100%" },
    { level: "Уровень 2", friends: 0, income: "0 UNI", percent: "2%" },
    { level: "Уровень 3", friends: 0, income: "0 UNI", percent: "3%" },
    { level: "Уровень 4", friends: 0, income: "0 UNI", percent: "4%" },
    { level: "Уровень 5", friends: 0, income: "0 UNI", percent: "5%" },
    { level: "Уровень 6", friends: 0, income: "0 UNI", percent: "6%" },
    { level: "Уровень 7", friends: 0, income: "0 UNI", percent: "7%" },
    { level: "Уровень 8", friends: 0, income: "0 UNI", percent: "8%" },
    { level: "Уровень 9", friends: 0, income: "0 UNI", percent: "9%" },
    { level: "Уровень 10", friends: 0, income: "0 UNI", percent: "10%" },
    { level: "Уровень 11", friends: 0, income: "0 UNI", percent: "11%" },
    { level: "Уровень 12", friends: 0, income: "0 UNI", percent: "12%" },
    { level: "Уровень 13", friends: 0, income: "0 UNI", percent: "13%" },
    { level: "Уровень 14", friends: 0, income: "0 UNI", percent: "14%" },
    { level: "Уровень 15", friends: 0, income: "0 UNI", percent: "15%" },
    { level: "Уровень 16", friends: 0, income: "0 UNI", percent: "16%" },
    { level: "Уровень 17", friends: 0, income: "0 UNI", percent: "17%" },
    { level: "Уровень 18", friends: 0, income: "0 UNI", percent: "18%" },
    { level: "Уровень 19", friends: 0, income: "0 UNI", percent: "19%" },
    { level: "Уровень 20", friends: 0, income: "0 UNI", percent: "20%" },
  ];
  
  // Состояния для анимаций и эффектов
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [visibleRows, setVisibleRows] = useState<number[]>([]);
  
  // Ref для скролла
  const tableRef = useRef<HTMLDivElement>(null);
  
  // Цветовой градиент для уровней
  const getLevelColor = (index: number) => {
    // Создаем градиент от фиолетового к зеленому через 20 уровней
    if (index === 0) return 'bg-primary'; // Первый уровень - фиолетовый
    
    // Рассчитываем позицию в градиенте от 0 до 1
    const position = index / (levels.length - 1);
    
    // Преобразуем позицию в HSL цвет, где hue меняется от 280 (фиолетовый) до 140 (зеленый)
    const hue = 280 - position * 140; 
    const saturation = 80;
    const lightness = 65;
    
    return `bg-[hsl(${hue},${saturation}%,${lightness}%)]`;
  };
  
  // Обработчик для анимированного появления строк таблицы
  useEffect(() => {
    // Сбрасываем список видимых строк
    setVisibleRows([]);
    
    // Постепенно показываем все строки с меньшей задержкой между ними
    levels.forEach((_, index) => {
      setTimeout(() => {
        setVisibleRows(prev => [...prev, index]);
      }, 30 + index * 40); // Задержка от 30 до 50 мс между строками
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
          
          <div className="absolute right-0 top-6 w-64 bg-card p-3 rounded-md shadow-lg text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-30">
            <p className="mb-2">
              <span className="font-medium">Как работает доход от дохода?</span>
            </p>
            <p className="mb-1">Вы получаете процент от дохода приглашенных пользователей до 20 уровней в глубину!</p>
            <p>Чем больше друзей на каждом уровне, тем выше ваш доход.</p>
          </div>
        </div>
      </div>
      
      {/* Скроллируемая таблица со всеми уровнями */}
      <div 
        ref={tableRef}
        className="overflow-y-auto max-h-[350px] relative scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-muted/10 pr-1"
        style={{
          boxShadow: 'inset 0 -10px 10px -10px rgba(0,0,0,0.1)'
        }}
      >
        <table className="w-full">
          <thead className="sticky top-0 bg-card z-10">
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
                    transition-all duration-300
                    ${isVisible ? 'opacity-100' : 'opacity-0'}
                    ${isActive ? 'bg-primary/5' : 'hover:bg-primary/5'}
                    ${index % 2 === 0 ? 'bg-black/5' : ''}
                  `}
                  style={{
                    transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
                    transitionDelay: `${index * 30}ms`,
                    boxShadow: isActive ? '0 0 10px rgba(162, 89, 255, 0.1)' : 'none'
                  }}
                  onMouseEnter={() => setActiveRow(index)}
                  onMouseLeave={() => setActiveRow(null)}
                >
                  <td className="py-2 text-sm px-2 border-b border-muted/20">
                    <div className="flex items-center">
                      {/* Цветной индикатор уровня с градиентом */}
                      <div 
                        className={`
                          w-2 h-2 rounded-full mr-2
                          ${getLevelColor(index)}
                          transition-all duration-300
                          ${isActive ? 'scale-125' : ''}
                        `}
                      ></div>
                      <span 
                        className={`
                          transition-transform duration-300 
                          ${isActive ? 'translate-x-1 text-primary/90 font-medium' : ''}
                        `}
                      >
                        {item.level}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 text-sm px-2 border-b border-muted/20">{item.friends}</td>
                  <td className="py-2 text-sm text-accent px-2 border-b border-muted/20">{item.income}</td>
                  <td className="py-2 text-sm text-right px-2 border-b border-muted/20">
                    <span 
                      className={`
                        inline-block px-2 py-1 rounded-full text-xs
                        transition-all duration-300
                        ${isActive ? 'scale-110' : ''}
                      `}
                      style={{
                        backgroundColor: `hsla(${280 - (index / (levels.length - 1)) * 140}, 80%, 65%, 0.2)`,
                        color: `hsla(${280 - (index / (levels.length - 1)) * 140}, 80%, 65%, 1)`
                      }}
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
      <div className="mt-3 text-xs text-center text-foreground opacity-50 italic">
        <div className="flex justify-center items-center">
          <i className="fas fa-sync-alt text-primary/50 mr-1 animate-spin-slow"></i>
          <span>Ваши партнерские уровни и доходы обновляются в реальном времени</span>
        </div>
      </div>
    </div>
  );
};

export default ReferralLevelsTable;
