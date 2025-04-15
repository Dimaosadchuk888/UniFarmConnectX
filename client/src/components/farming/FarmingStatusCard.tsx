import React, { useState, useEffect } from 'react';

const FarmingStatusCard: React.FC = () => {
  // Анимация числовых значений
  const [dailyYield, setDailyYield] = useState(0);
  const [perSecond, setPerSecond] = useState(0);
  
  // Анимация пульсирующего эффекта с периодическим запуском
  const [isPulsing, setIsPulsing] = useState(false);
  
  // Индикатор активности фарминга
  const [isActive, setIsActive] = useState(true);
  const [dotOpacity, setDotOpacity] = useState(0.5);
  
  // Анимация значений при загрузке компонента
  useEffect(() => {
    // Анимируем нарастание значений
    const animationDuration = 1800;
    const startTime = Date.now();
    const targetDaily = 0; // Целевое значение в день
    const targetPerSecond = 0; // Целевое значение в секунду
    
    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // Эффект замедления в конце для плавного окончания анимации
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      setDailyYield(targetDaily * easedProgress);
      setPerSecond(targetPerSecond * easedProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, []);
  
  // Эффект пульсации каждые несколько секунд
  useEffect(() => {
    const intervalId = setInterval(() => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 800);
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Анимация мигающего индикатора
  useEffect(() => {
    const intervalId = setInterval(() => {
      setDotOpacity(prev => prev === 0.5 ? 1 : 0.5);
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Стиль для индикатора активности
  const activeIndicatorStyle = {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: isActive ? '#00FF99' : '#A259FF',
    opacity: dotOpacity,
    transition: 'opacity 0.5s ease',
    marginRight: '8px'
  };
  
  return (
    <div className="bg-card rounded-xl p-4 mb-5 shadow-lg card-hover-effect">
      <div className="flex items-center mb-3">
        <div style={activeIndicatorStyle}></div>
        <p className="text-sm font-medium">
          {isActive ? 'Фарминг активен' : 'Фарминг неактивен'}
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className={`transition-all duration-300 ${isPulsing ? 'scale-105' : 'scale-100'}`}>
          <p className="text-sm text-foreground opacity-70">Текущий доход</p>
          <p className="text-lg font-semibold green-gradient-text relative">
            {dailyYield.toFixed(0)} UNI / сутки
            {isPulsing && (
              <span className="absolute -right-4 top-0">
                <svg className="w-4 h-4 text-accent animate-pulse-fade" 
                  fill="none" stroke="currentColor" viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" 
                    strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </span>
            )}
          </p>
        </div>
        
        <div className="relative overflow-hidden">
          <p className="text-sm text-foreground opacity-70">Активный Boost</p>
          <div className="flex items-center">
            <p className="text-md">—</p>
            {/* Стилизованная подсказка о буст-эффекте */}
            <div className="absolute right-0 bottom-0 opacity-20 transform rotate-12">
              <i className="fas fa-bolt text-3xl text-primary"></i>
            </div>
          </div>
        </div>
        
        <div className={`transition-all duration-300 ${isPulsing ? 'scale-105' : 'scale-100'}`}>
          <p className="text-sm text-foreground opacity-70">Начисление</p>
          <p className="text-md green-gradient-text font-medium relative">
            {perSecond.toFixed(4)} UNI / сек
          </p>
        </div>
      </div>
      
      {/* Прогресс-бар до следующего повышения (визуальный элемент) */}
      <div className="mt-4">
        <div className="flex justify-between items-center text-xs mb-1">
          <p className="text-foreground opacity-70">Прогресс до +10% дохода</p>
          <p className="text-foreground">12%</p>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent" 
            style={{ width: '12%', transition: 'width 1s ease-in-out' }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default FarmingStatusCard;
