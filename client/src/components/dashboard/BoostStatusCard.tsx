import React, { useState, useEffect } from 'react';

const BoostStatusCard: React.FC = () => {
  // Array of 4 boost slots, all empty initially
  const boostSlots = Array(4).fill(null);
  
  // Эффект парящего элемента с разными задержками для каждого слота
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [glowingSlotsIndices, setGlowingSlotsIndices] = useState<number[]>([]);
  
  // Случайно выбираем слоты для анимации свечения
  useEffect(() => {
    // Имитация активации 1-2 случайных слотов (только визуальный эффект)
    const randomNumberOfSlots = Math.floor(Math.random() * 2) + 1; // 1 или 2 слота
    const indices: number[] = [];
    
    while (indices.length < randomNumberOfSlots) {
      const randomIndex = Math.floor(Math.random() * 4);
      if (!indices.includes(randomIndex)) {
        indices.push(randomIndex);
      }
    }
    
    setGlowingSlotsIndices(indices);
    
    // Каждые 8 секунд меняем анимируемые слоты
    const intervalId = setInterval(() => {
      const newIndices: number[] = [];
      const randomNumberOfSlots = Math.floor(Math.random() * 2) + 1;
      
      while (newIndices.length < randomNumberOfSlots) {
        const randomIndex = Math.floor(Math.random() * 4);
        if (!newIndices.includes(randomIndex)) {
          newIndices.push(randomIndex);
        }
      }
      
      setGlowingSlotsIndices(newIndices);
    }, 8000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  return (
    <div className="bg-card rounded-xl p-4 mb-5 shadow-lg card-hover-effect gradient-border">
      <div className="flex justify-between items-center">
        <h2 className="text-md font-medium">Активные Boost</h2>
        <p className="text-foreground font-medium">0 / 4</p>
      </div>
      <p className="text-xs text-foreground opacity-70 mt-1">Ускорители увеличивают доходность</p>
      
      <div className="mt-4 grid grid-cols-4 gap-2">
        {boostSlots.map((_, index) => {
          const isGlowing = glowingSlotsIndices.includes(index);
          const isHovered = hoverIndex === index;
          
          return (
            <div 
              key={index}
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
              className={`
                rounded-lg bg-muted p-2 flex items-center justify-center opacity-50
                transition-all duration-300 cursor-pointer
                ${isHovered ? 'transform scale-110 bg-opacity-70' : ''}
                ${isGlowing ? 'glow-effect' : ''}
              `}
              style={{
                animationDelay: `${index * 0.2}s`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <i className={`
                fas fa-bolt text-xl
                ${isGlowing ? 'text-primary' : 'text-foreground'}
                ${isHovered ? 'float-animation' : ''}
              `}></i>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BoostStatusCard;
