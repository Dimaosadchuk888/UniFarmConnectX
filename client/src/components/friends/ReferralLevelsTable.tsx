import React, { useState, useEffect, useRef } from 'react';
import { Coins } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// Интерфейс для данных уровня реферальной программы
interface ReferralLevel {
  level: string;
  friends: number;
  income: {
    uni: string;
    ton: string;
  };
  percent: string;
}

// Константа с процентами выплат по уровням
const LEVEL_PERCENTAGES = [100, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const ReferralLevelsTable: React.FC = () => {
  // Интерфейс для ответа API
  interface ReferralsResponse {
    data: {
      user_id: number;
      username: string;
      total_referrals: number;
      referral_counts: Record<number, number>;
      level_income: Record<number, { uni: number, ton: number }>;
      referrals: any[];
    };
    success: boolean;
  }

  // Получаем userId из Telegram
  const telegram = window.Telegram?.WebApp;
  const userId = telegram?.initDataUnsafe?.user?.id;
  
  console.log('[ReferralLevelsTable] Текущий пользователь:', userId);
  
  // Запрос на получение структуры рефералов с сервера
  const { data: referralsData, isLoading, error } = useQuery<ReferralsResponse>({
    queryKey: ['/api/referrals', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('Отсутствует идентификатор пользователя');
      }
      
      // Использовать правильный параметр user_id вместо userId согласно API
      const response = await fetch(`/api/referrals?user_id=${userId}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ReferralLevelsTable] Ошибка API:', errorText);
        throw new Error(`Ошибка получения данных о рефералах: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: !!userId,
    refetchOnWindowFocus: false,
    retry: 1, // Повторить запрос только 1 раз в случае ошибки
    refetchInterval: false, // Отключить автоматическое обновление
  });
  
  // Логи для отладки
  React.useEffect(() => {
    if (error) {
      console.error('[ReferralLevelsTable] Ошибка запроса:', error);
    }
    if (referralsData) {
      console.log('[ReferralLevelsTable] Данные получены:', referralsData);
    }
  }, [referralsData, error]);
  
  // Проверка на отсутствие рефералов
  const hasReferrals = React.useMemo(() => {
    if (!referralsData) return false;
    const totalReferrals = referralsData.data.total_referrals || 0;
    return totalReferrals > 0;
  }, [referralsData]);

  // Преобразуем данные с сервера в нужный формат для отображения
  const levels: ReferralLevel[] = React.useMemo(() => {
    // Если данные еще не загружены, возвращаем пустые уровни
    if (!referralsData) {
      return Array.from({ length: 20 }, (_, i) => ({
        level: `Уровень ${i + 1}`,
        friends: 0,
        income: { uni: "0 UNI", ton: "0 TON" },
        percent: `${LEVEL_PERCENTAGES[i]}%`
      }));
    }
    
    try {
      // Получаем количество рефералов по уровням и доходы
      const referralCounts = referralsData.data.referral_counts || {};
      const levelIncome = referralsData.data.level_income || {};
      
      console.log('[ReferralLevelsTable] API данные:', { 
        referralCounts, 
        levelIncome,
        totalReferrals: referralsData.data.total_referrals
      });
      
      // Формируем массив уровней с данными из API
      return Array.from({ length: 20 }, (_, i) => {
        const levelNumber = i + 1;
        const count = referralCounts[levelNumber] || 0;
        
        // Получаем доходы от рефералов по уровням или устанавливаем нулевые значения
        const uniIncome = levelIncome[levelNumber]?.uni || 0;
        const tonIncome = levelIncome[levelNumber]?.ton || 0;
        
        // Форматируем числа до 8 знаков для UNI и до 6 знаков для TON
        const formattedUniIncome = typeof uniIncome === 'number' 
          ? parseFloat(uniIncome.toFixed(8)) 
          : 0;
        
        const formattedTonIncome = typeof tonIncome === 'number' 
          ? parseFloat(tonIncome.toFixed(6)) 
          : 0;
        
        return {
          level: `Уровень ${levelNumber}`,
          friends: count,
          income: { 
            uni: `${formattedUniIncome} UNI`, 
            ton: `${formattedTonIncome} TON` 
          },
          percent: `${LEVEL_PERCENTAGES[i]}%`
        };
      });
    } catch (error) {
      console.error('[ReferralLevelsTable] Ошибка обработки данных:', error);
      // В случае ошибки возвращаем пустые уровни
      return Array.from({ length: 20 }, (_, i) => ({
        level: `Уровень ${i + 1}`,
        friends: 0,
        income: { uni: "0 UNI", ton: "0 TON" },
        percent: `${LEVEL_PERCENTAGES[i]}%`
      }));
    }
  }, [referralsData]);
  
  // Состояния для анимаций и эффектов
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [visibleRows, setVisibleRows] = useState<number[]>([]);
  
  // Ref для скролла
  const tableRef = useRef<HTMLDivElement>(null);
  
  // Функция для плавного скролла вверх/вниз
  const scrollTable = (direction: 'up' | 'down') => {
    if (tableRef.current) {
      const container = tableRef.current;
      const scrollAmount = 200; // пикселей за один скролл
      const targetScroll = direction === 'up' 
        ? container.scrollTop - scrollAmount 
        : container.scrollTop + scrollAmount;
      
      container.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
    }
  };
  
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
  
  // Обработчик для анимированного появления строк таблицы с плавным эффектом
  useEffect(() => {
    // Сбрасываем список видимых строк
    setVisibleRows([]);
    
    // Создаем эффект волны при появлении (быстрее в начале, затем медленнее)
    levels.forEach((_, index) => {
      const initialDelay = 100; // начальная задержка
      const staggerAmount = Math.min(35 + (index * 8), 70); // увеличивающаяся задержка между элементами, максимум 70мс
      
      setTimeout(() => {
        setVisibleRows(prev => [...prev, index]);
        
        // Случайно активируем некоторые строки для эффекта "живого" интерфейса
        if (index === 0 || Math.random() < 0.2) {
          setActiveRow(index);
          setTimeout(() => {
            setActiveRow(null);
          }, 800 + Math.random() * 400);
        }
      }, initialDelay + (index * staggerAmount));
    });
    
    // Устанавливаем эффект случайного мигания уровней в фоне
    const intervalId = setInterval(() => {
      // Случайно выбираем строку для подсветки
      const randomIndex = Math.floor(Math.random() * levels.length);
      setActiveRow(randomIndex);
      
      // И сбрасываем через короткое время
      setTimeout(() => {
        setActiveRow(null);
      }, 500);
    }, 5000); // Каждые 5 секунд
    
    // Очищаем интервал при размонтировании
    return () => clearInterval(intervalId);
  }, []);
  
  return (
    <div className="bg-card rounded-xl p-4 shadow-lg relative overflow-hidden">
      {/* Градиентное свечение по краям */}
      <div 
        className="absolute inset-0 rounded-xl z-0 opacity-60" 
        style={{ 
          background: 'radial-gradient(ellipse at 50% 0%, rgba(162, 89, 255, 0.15) 0%, transparent 70%), radial-gradient(ellipse at 50% 100%, rgba(162, 89, 255, 0.15) 0%, transparent 70%), radial-gradient(ellipse at 0% 50%, rgba(162, 89, 255, 0.15) 0%, transparent 70%), radial-gradient(ellipse at 100% 50%, rgba(162, 89, 255, 0.15) 0%, transparent 70%)'
        }}
      ></div>
      
      {/* Пульсирующий декоративный фоновый элемент */}
      <div 
        className="absolute -right-16 -bottom-16 w-32 h-32 bg-primary/10 rounded-full blur-xl"
        style={{ animation: 'pulse-fade 4s infinite ease-in-out' }}
      ></div>
      
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center">
          <h2 className="text-md font-medium">Уровни партнерской программы</h2>
          
          {/* Индикатор загрузки */}
          {isLoading && (
            <div className="ml-2 animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
          )}
          
          {/* Индикатор ошибки */}
          {error && (
            <div className="ml-2 text-red-500 text-xs">
              <span className="flex items-center">
                <i className="fas fa-exclamation-circle mr-1"></i>
                Ошибка загрузки
              </span>
            </div>
          )}
        </div>
        
        {/* Иконка вопроса с всплывающей подсказкой */}
        <div className="relative group">
          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center cursor-pointer text-xs">
            <i className="fas fa-question"></i>
          </div>
          
          <div className="absolute right-0 top-6 w-64 bg-card p-3 rounded-md shadow-lg text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-30">
            <p className="mb-2">
              <span className="font-medium">Как работает доход от бустов?</span>
            </p>
            <p className="mb-1">Вы получаете процент от покупок бустов приглашенных пользователей до 20 уровней в глубину!</p>
            <p>С первого уровня – 100%, со 2-го по 20-й от 2% до 20% соответственно.</p>
          </div>
        </div>
      </div>
      
      {/* Скроллируемая таблица со всеми уровнями */}
      <div 
        ref={tableRef}
        className="overflow-y-auto max-h-[350px] relative scrollbar-none pr-2 transition-all duration-300"
        style={{
          boxShadow: 'inset 0 -10px 10px -10px rgba(0,0,0,0.3), inset 0 10px 10px -10px rgba(0,0,0,0.3)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)'
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
                  <td className="py-2 text-sm px-2 border-b border-muted/20">
                    {item.friends > 0 ? (
                      <div className="flex items-center">
                        <span className="bg-green-900/20 text-green-400 px-2 py-0.5 rounded-md flex items-center">
                          <i className="fas fa-user-friends text-[9px] mr-1.5"></i>
                          {item.friends}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 opacity-60">0</span>
                    )}
                  </td>
                  <td className="py-2 text-sm px-2 border-b border-muted/20">
                    <div className="flex flex-col">
                      {/* UNI доход */}
                      <div className={`
                        flex items-center
                        ${item.income.uni !== "0 UNI" ? "bg-purple-900/20 px-2 py-0.5 rounded-md" : ""}
                      `}>
                        {item.income.uni !== "0 UNI" && (
                          <Coins className="h-3 w-3 text-purple-400 mr-1.5 flex-shrink-0" />
                        )}
                        <span className={`
                          ${item.income.uni === "0 UNI" 
                            ? "text-gray-400 opacity-60" 
                            : "text-purple-300"
                          }
                        `}>
                          {item.income.uni.split(" ")[0]}
                        </span>
                        <span className="text-gray-400 ml-1.5 text-xs">UNI</span>
                      </div>
                      
                      {/* TON доход */}
                      <div className={`
                        flex items-center mt-0.5
                        ${item.income.ton !== "0 TON" ? "bg-blue-900/20 px-2 py-0.5 rounded-md" : ""}
                      `}>
                        {item.income.ton !== "0 TON" && (
                          <i className="fas fa-diamond text-blue-400 text-[9px] mr-1.5 flex-shrink-0"></i>
                        )}
                        <span className={`
                          ${item.income.ton === "0 TON" 
                            ? "text-gray-400 opacity-60" 
                            : "text-blue-400"
                          }
                        `}>
                          {item.income.ton.split(" ")[0]}
                        </span>
                        <span className="text-gray-400 ml-1.5 text-xs">TON</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 text-sm text-right px-2 border-b border-muted/20">
                    {index === 0 ? (
                      <span 
                        className={`
                          inline-block px-3 py-1.5 rounded-full text-xs font-bold
                          transition-all duration-300 
                          bg-gradient-to-r from-primary to-purple-400
                          text-white
                          ${isActive ? 'scale-110 shadow-lg shadow-primary/30' : 'shadow-md shadow-primary/20'}
                        `}
                      >
                        {item.percent}
                        <i className="fas fa-star text-[10px] ml-1 opacity-70"></i>
                      </span>
                    ) : (
                      <span 
                        className={`
                          inline-block px-2 py-1 rounded-full text-xs
                          transition-all duration-300
                          ${isActive ? 'scale-110' : ''}
                        `}
                        style={{
                          background: `linear-gradient(90deg, hsla(${280 - (index / (levels.length - 1)) * 140}, 80%, 65%, 0.2), hsla(${180 - (index / (levels.length - 1)) * 30}, 80%, 65%, 0.05))`,
                          color: `hsla(${280 - (index / (levels.length - 1)) * 140}, 80%, 65%, 1)`
                        }}
                      >
                        {item.percent}
                      </span>
                    )}
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
      
      {/* Кнопки для плавного скролла */}
      <div className="flex justify-center mt-3 mb-1 space-x-2">
        <button
          className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-all duration-300"
          onClick={() => scrollTable('up')}
          aria-label="Scroll up"
        >
          <i className="fas fa-chevron-up text-xs"></i>
        </button>
        <button
          className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-all duration-300"
          onClick={() => scrollTable('down')}
          aria-label="Scroll down"
        >
          <i className="fas fa-chevron-down text-xs"></i>
        </button>
      </div>
      
      {/* Информационное сообщение */}
      <div className="mt-1 text-xs text-center text-foreground opacity-50 italic">
        <div className="flex justify-center items-center">
          <i className="fas fa-sync-alt text-primary/50 mr-1 animate-spin-slow"></i>
          <span>Ваши партнерские уровни и доходы обновляются в реальном времени (от 2% до 20% на уровнях 2-20)</span>
        </div>
      </div>
    </div>
  );
};

export default ReferralLevelsTable;
