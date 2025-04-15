import React, { useState, useRef } from 'react';
import { BOOST_PACKAGES } from '@/lib/constants';

const BoostOptions: React.FC = () => {
  // Состояния для анимаций и эффектов
  const [hoveredPackId, setHoveredPackId] = useState<number | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  
  // Ref для измерения скорости анимации хешрейта
  const animationSpeedRef = useRef<number[]>([]);
  
  const handleBoostPackClick = (packId: number) => {
    // Если карточка уже открыта, закрываем ее. Иначе открываем.
    if (selectedPackId === packId) {
      setSelectedPackId(null);
    } else {
      setSelectedPackId(packId);
    }
  };
  
  // Функция для отображения tooltip с описанием хешрейта
  const toggleTooltip = () => {
    setShowTooltip(!showTooltip);
  };
  
  // Хелпер для анимации хешрейта
  const getHashrateAnimationSpeed = (hashrate: number) => {
    // Базовая скорость + регулировка на основе хешрейта
    return Math.max(0.5, 3 - (hashrate / 50)); // чем выше хешрейт, тем быстрее анимация
  };
  
  // Генерация случайной позиции для визуализации хешрейта
  const getRandomPosition = () => {
    return {
      top: `${Math.floor(Math.random() * 60) + 20}%`,
      left: `${Math.floor(Math.random() * 60) + 20}%`,
      scale: Math.random() * 0.5 + 0.5
    };
  };
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-white">Boost</h2>
        
        {/* Иконка вопроса с всплывающей подсказкой */}
        <div className="relative">
          <div 
            className="w-5 h-5 rounded-full bg-muted flex items-center justify-center cursor-pointer text-xs"
            onMouseEnter={toggleTooltip}
            onMouseLeave={toggleTooltip}
          >
            <i className="fas fa-question"></i>
          </div>
          
          {showTooltip && (
            <div className="absolute right-0 top-6 w-64 bg-card p-3 rounded-md shadow-lg text-xs z-20">
              <p className="mb-2">
                <span className="font-medium">Что такое Boost?</span>
              </p>
              <p className="mb-1">Boost - это ускоритель фарминга UNI токенов, который увеличивает скорость добычи.</p>
              <p className="mb-1">
                <span className="inline-flex items-center font-medium">
                  <i className="fas fa-tachometer-alt text-primary mr-1"></i> Hashrate (H/s)
                </span> 
                - это скорость вычислений, чем выше, тем больше токенов вы получаете.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {BOOST_PACKAGES.map((pack) => {
        const isHovered = hoveredPackId === pack.id;
        const isSelected = selectedPackId === pack.id;
        
        // Скорость анимации хешрейта
        const hashAnimationSpeed = getHashrateAnimationSpeed(pack.hashrate);
        
        // Создаем индикаторы хешрейта (количество точек зависит от hashrate)
        const hashIndicators = Array.from(
          { length: Math.min(5, Math.ceil(pack.hashrate / 20)) }, 
          (_, index) => {
            const position = getRandomPosition();
            return { id: `hash-${pack.id}-${index}`, position };
          }
        );
        
        return (
          <div 
            key={pack.id}
            className={`
              bg-card rounded-xl p-4 mb-3 shadow-lg 
              transition-all duration-500 relative overflow-hidden cursor-pointer
              ${pack.isPrimary ? 'border border-primary' : ''}
              ${isSelected ? 'card-expanded shadow-xl' : 'card-hover-effect'}
            `}
            onClick={() => handleBoostPackClick(pack.id)}
            onMouseEnter={() => setHoveredPackId(pack.id)}
            onMouseLeave={() => setHoveredPackId(null)}
            style={{
              height: isSelected ? '280px' : 'auto',
              transition: 'height 0.5s ease, transform 0.3s ease, box-shadow 0.3s ease'
            }}
          >
            {/* Фоновый эффект для пакетов */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50 z-0"
              style={{
                background: `linear-gradient(135deg, rgba(162, 89, 255, ${pack.isPrimary ? '0.15' : '0.05'}) 0%, rgba(0, 0, 0, 0) 60%)`,
                transition: 'opacity 0.3s ease',
                opacity: isHovered || isSelected ? 0.8 : 0.5
              }}
            ></div>
            
            {/* Верхняя часть карточки */}
            <div className="flex justify-between items-center mb-2 relative z-10">
              <h3 className={`
                text-md font-medium
                transition-all duration-300 
                ${(isHovered || isSelected) ? 'transform translate-x-1' : ''}
              `}>{pack.name}</h3>
              
              <div className={`
                px-2 py-1 transition-all duration-300
                ${pack.type === 'UNI' 
                  ? 'bg-primary/20 rounded-full' 
                  : 'bg-muted rounded-full'
                }
                ${isHovered ? 'scale-110' : ''}
              `}>
                <span className={`
                  text-sm 
                  ${pack.type === 'UNI' ? 'text-primary' : 'text-foreground'}
                `}>{pack.type}</span>
              </div>
            </div>
            
            {/* Описание и индикатор хешрейта */}
            <div className="flex justify-between items-start mb-3 relative z-10">
              <p className="text-xs text-foreground opacity-70 flex-grow">
                {pack.description}
              </p>
              
              {/* Хешрейт (H/s) */}
              <div 
                className={`
                  flex flex-col items-center ml-2
                  transition-all duration-300
                  ${isHovered ? 'scale-110' : ''}
                `}
              >
                <div className="text-xs text-foreground opacity-70 mb-1">Hashrate</div>
                <div className="flex items-center">
                  <span className="text-md font-semibold text-primary">{pack.hashrate}</span>
                  <span className="text-xs text-primary ml-1">H/s</span>
                </div>
              </div>
            </div>
            
            {/* Кнопка покупки */}
            <button 
              className={`
                relative z-10 transition-all duration-300
                overflow-hidden
                ${pack.isPrimary 
                  ? "bg-gradient-to-r from-primary to-indigo-500 w-full text-white py-2 rounded-lg font-medium"
                  : "w-full py-2 rounded-lg font-medium border border-muted text-foreground hover:border-primary/50"
                }
                ${isHovered && !isSelected ? 'transform scale-105' : ''}
              `}
              onClick={(e) => {
                e.stopPropagation(); // Предотвращаем срабатывание клика на родительском div
                // Здесь будет логика покупки пакета в реальном приложении
              }}
            >
              {/* Пульсация при наведении на кнопку */}
              <div 
                className="absolute inset-0 overflow-hidden"
                style={{
                  opacity: isHovered ? 1 : 0,
                  transition: 'opacity 0.3s ease'
                }}
              >
                <div 
                  className="absolute inset-0 flex justify-center items-center"
                  style={{
                    animation: 'pulse-fade 1.5s infinite',
                    background: pack.isPrimary
                      ? 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%)'
                      : 'radial-gradient(circle, rgba(162,89,255,0.2) 0%, rgba(162,89,255,0) 70%)'
                  }}
                ></div>
              </div>
              
              {/* Эффект свечения кнопки */}
              {isHovered && (
                <div 
                  className="absolute inset-0 w-full h-full" 
                  style={{
                    background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)',
                    transform: 'translateX(-100%)',
                    animation: 'shimmer 2s infinite'
                  }}
                ></div>
              )}
              
              <span className="relative z-10">{pack.price}</span>
            </button>
            
            {/* Раскрывающаяся часть карточки (видна только при клике) */}
            {isSelected && (
              <div className="mt-4 overflow-hidden" style={{ animation: 'fadeIn 0.5s ease' }}>
                <div className="border-t border-muted/50 pt-3">
                  <h4 className="text-sm font-medium mb-2">Детали пакета</h4>
                  
                  {/* Информация о хешрейте и продолжительности */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-black/20 rounded-lg p-2 flex flex-col items-center">
                      <i className="fas fa-tachometer-alt text-primary mb-1"></i>
                      <span className="text-xs opacity-70">Hashrate</span>
                      <span className="text-sm font-medium">{pack.hashrate} H/s</span>
                    </div>
                    <div className="bg-black/20 rounded-lg p-2 flex flex-col items-center">
                      <i className="fas fa-calendar-alt text-primary mb-1"></i>
                      <span className="text-xs opacity-70">Длительность</span>
                      <span className="text-sm font-medium">{pack.days} дней</span>
                    </div>
                  </div>
                  
                  {/* Визуализация хешрейта */}
                  <div className="relative h-20 bg-black/10 rounded-lg mb-2 overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs text-foreground/50">Визуализация работы</span>
                    </div>
                    
                    {/* Анимированные точки, имитирующие работу хешрейта */}
                    {hashIndicators.map((indicator) => (
                      <div 
                        key={indicator.id}
                        className="absolute w-2 h-2 rounded-full bg-primary/80"
                        style={{
                          top: indicator.position.top,
                          left: indicator.position.left,
                          transform: `scale(${indicator.position.scale})`,
                          animation: `pulse-fade ${hashAnimationSpeed}s infinite`,
                          animationDelay: `${Math.random() * 2}s`
                        }}
                      ></div>
                    ))}
                    
                    {/* Линии, соединяющие точки */}
                    {hashIndicators.length > 1 && (
                      <svg className="absolute inset-0 w-full h-full z-0 opacity-30">
                        {hashIndicators.map((indicator, i) => (
                          hashIndicators.slice(i + 1).map((nextIndicator, j) => (
                            <line 
                              key={`line-${i}-${j}`}
                              x1={`${parseInt(indicator.position.left) + 4}%`}
                              y1={`${parseInt(indicator.position.top) + 4}%`}
                              x2={`${parseInt(nextIndicator.position.left) + 4}%`}
                              y2={`${parseInt(nextIndicator.position.top) + 4}%`}
                              stroke="hsl(280, 75%, 60%)"
                              strokeWidth="1"
                              strokeOpacity="0.3"
                            />
                          ))
                        ))}
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Индикатор популярности для главного пакета */}
            {pack.isPrimary && (
              <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 rotate-45 bg-primary text-white text-xs px-4 py-1 z-10">
                Популярный
              </div>
            )}
          </div>
        );
      })}
      
      <p className="text-xs text-foreground opacity-70 italic text-center mt-2">
        Оплата через TON будет доступна позже
      </p>
    </div>
  );
};

export default BoostOptions;
