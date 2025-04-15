import React, { useState, useRef } from 'react';
import { BOOST_PACKAGES } from '@/lib/constants';

const BoostOptions: React.FC = () => {
  // Состояния для анимаций и эффектов
  const [hoveredPackId, setHoveredPackId] = useState<number | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [activeToggles, setActiveToggles] = useState<number[]>([]);
  
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
  
  // Функция для переключения активации пакета
  const toggleBoostActive = (packId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем срабатывание клика на родительском div
    
    if (activeToggles.includes(packId)) {
      setActiveToggles(activeToggles.filter(id => id !== packId));
    } else {
      setActiveToggles([...activeToggles, packId]);
    }
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
        <h2 className="text-lg font-semibold text-white flex items-center">
          <i className="fas fa-rocket text-primary mr-2"></i>
          Boost Пакеты
        </h2>
        
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
              <p className="mb-1">Boost - это ускоритель фарминга UNI и TON токенов, который увеличивает скорость добычи.</p>
              <p className="mb-1">
                <span className="inline-flex items-center font-medium">
                  <i className="fas fa-bolt text-primary mr-1"></i> Доходность
                </span> 
                - это ежедневный процент от начисления токенов UNI и TON.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {BOOST_PACKAGES.map((pack) => {
        const isHovered = hoveredPackId === pack.id;
        const isSelected = selectedPackId === pack.id;
        const isActive = activeToggles.includes(pack.id);
        
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
              bg-card rounded-xl p-4 mb-3
              transition-all duration-500 relative overflow-hidden cursor-pointer
              border border-purple-900/30
              ${isActive ? 'shadow-lg shadow-primary/20' : 'shadow-md'}
              ${isSelected ? 'card-expanded shadow-xl' : 'hover:shadow-lg hover:shadow-primary/10'}
            `}
            onClick={() => handleBoostPackClick(pack.id)}
            onMouseEnter={() => setHoveredPackId(pack.id)}
            onMouseLeave={() => setHoveredPackId(null)}
            style={{
              height: isSelected ? '320px' : 'auto',
              transition: 'height 0.5s ease, transform 0.3s ease, box-shadow 0.3s ease',
              background: isActive 
                ? 'linear-gradient(135deg, rgba(30, 30, 40, 1) 0%, rgba(35, 30, 45, 1) 100%)' 
                : 'linear-gradient(135deg, rgba(20, 20, 25, 1) 0%, rgba(25, 20, 30, 1) 100%)'
            }}
          >
            {/* Фоновый эффект свечения по краям */}
            <div 
              className="absolute inset-0 opacity-50 z-0 rounded-xl"
              style={{
                background: pack.isPrimary || isActive
                  ? 'radial-gradient(ellipse at 30% 20%, rgba(162, 89, 255, 0.2) 0%, transparent 70%), radial-gradient(ellipse at 70% 80%, rgba(162, 89, 255, 0.15) 0%, transparent 70%)'
                  : 'radial-gradient(ellipse at 30% 20%, rgba(162, 89, 255, 0.1) 0%, transparent 70%), radial-gradient(ellipse at 70% 80%, rgba(162, 89, 255, 0.05) 0%, transparent 70%)',
                opacity: isHovered || isSelected || isActive ? '0.7' : '0.4',
                transition: 'opacity 0.5s ease'
              }}
            ></div>
            
            {/* Верхняя часть карточки */}
            <div className="flex justify-between items-center mb-3 relative z-10">
              <h3 className={`
                text-md font-medium flex items-center
                transition-all duration-300 text-purple-300
                ${(isHovered || isSelected) ? 'text-purple-200' : ''}
              `}>
                <i className="fas fa-bolt text-primary mr-2"></i>
                {pack.name}
              </h3>
              
              {/* Toggle переключатель активации */}
              <div 
                className={`
                  w-10 h-5 rounded-full relative cursor-pointer flex items-center
                  transition-all duration-300
                  ${isActive ? 'bg-primary' : 'bg-gray-600'}
                `}
                onClick={(e) => toggleBoostActive(pack.id, e)}
              >
                <div 
                  className={`
                    absolute w-4 h-4 rounded-full bg-white 
                    transition-all duration-300 shadow-md
                    ${isActive ? 'translate-x-5' : 'translate-x-1'}
                  `}
                >
                  {/* Тень вокруг переключателя в активном состоянии */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse" 
                      style={{ 
                        animation: 'pulse-size 1.5s infinite',
                        transform: 'scale(1.3)',
                        opacity: 0.5
                      }}
                    ></div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Основная информация о пакете */}
            <div className="grid grid-cols-2 gap-4 mb-3 relative z-10">
              <div className="flex flex-col justify-between">
                {/* UNI Yield */}
                <div className="mb-2">
                  <div className="text-xs text-gray-400 mb-1">UNI Yield:</div>
                  <div className="font-medium text-green-400 flex items-center">
                    <i className="fas fa-chart-line mr-1 text-xs"></i>
                    {pack.uniYield}
                  </div>
                </div>
                
                {/* TON Yield */}
                <div className="mb-2">
                  <div className="text-xs text-gray-400 mb-1">TON Yield:</div>
                  <div className="font-medium text-green-400 flex items-center">
                    <i className="fas fa-chart-line mr-1 text-xs"></i>
                    {pack.tonYield}
                  </div>
                </div>
                
                {/* Bonus */}
                <div>
                  <div className="text-xs text-gray-400 mb-1">Bonus:</div>
                  <div className="font-medium text-green-400 flex items-center">
                    <i className="fas fa-gift mr-1 text-amber-400 text-xs"></i>
                    {pack.bonus}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col justify-between">
                {/* Hashrate */}
                <div className="mb-2 flex flex-col items-end">
                  <div className="text-xs text-gray-400 mb-1">Hashrate:</div>
                  <div className="font-semibold text-primary flex items-center">
                    <i className="fas fa-tachometer-alt mr-1 text-xs"></i>
                    {pack.hashrate} <span className="text-xs ml-1">H/s</span>
                  </div>
                </div>
                
                {/* Duration */}
                <div className="mb-2 flex flex-col items-end">
                  <div className="text-xs text-gray-400 mb-1">Длительность:</div>
                  <div className="font-medium text-white">
                    {pack.days} дней
                  </div>
                </div>
                
                {/* Price */}
                <div className="flex flex-col items-end">
                  <div className="text-xs text-gray-400 mb-1">Стоимость:</div>
                  <div className="font-medium text-yellow-400">
                    {pack.price}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Кнопка покупки */}
            <button 
              className={`
                relative z-10 transition-all duration-300
                overflow-hidden w-full py-2.5 rounded-lg font-medium
                flex items-center justify-center
                bg-primary hover:bg-purple-600 text-white
                ${isHovered ? 'shadow-lg shadow-primary/30' : 'shadow-md shadow-primary/20'}
              `}
              onClick={(e) => {
                e.stopPropagation(); // Предотвращаем срабатывание клика на родительском div
                // Здесь будет логика покупки пакета в реальном приложении
              }}
            >
              {/* Иконка молнии */}
              <i className="fas fa-bolt mr-2"></i>
              
              {/* Эффект свечения кнопки */}
              <div 
                className="absolute inset-0 w-full h-full overflow-hidden" 
                style={{
                  background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)',
                  transform: 'translateX(-100%)',
                  animation: 'shimmer 2s infinite'
                }}
              ></div>
              
              <span className="relative z-10">Buy Boost</span>
            </button>
            
            {/* Раскрывающаяся часть карточки (видна только при клике) */}
            {isSelected && (
              <div className="mt-4 overflow-hidden relative z-10" style={{ animation: 'fadeIn 0.5s ease' }}>
                <div className="border-t border-purple-900/30 pt-3">
                  <h4 className="text-sm font-medium mb-2 text-purple-200">Визуализация работы</h4>
                  
                  {/* Визуализация хешрейта */}
                  <div className="relative h-24 bg-black/30 rounded-lg mb-2 overflow-hidden border border-purple-900/50">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs text-foreground/50">Mining Visualization</span>
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
              <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 rotate-45 bg-primary text-white text-xs px-4 py-1 z-10 shadow-lg">
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
