import React, { useState, useEffect, useRef } from 'react';

const IncomeCard: React.FC = () => {
  // Анимация нарастающего счетчика
  const [displayedRate, setDisplayedRate] = useState(0);
  const [displayedTotal, setDisplayedTotal] = useState(0);
  const [displayedTonRate, setDisplayedTonRate] = useState(0);
  const [displayedTonTotal, setDisplayedTonTotal] = useState(0);
  const targetRate = 0.0027; // Целевое значение UNI/сек
  const targetTotal = 134; // Целевое значение заработанных UNI
  const targetTonRate = 0.000023; // Целевое значение TON/сек
  const targetTonTotal = 0.0023; // Целевое значение заработанных TON за 24 часа
  
  // Рефы для анимации "всплеска"
  const pulseRef = useRef<boolean>(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [isTonPulsing, setIsTonPulsing] = useState(false);
  
  // Запускаем анимацию счетчика при первой загрузке
  useEffect(() => {
    const animationDuration = 2000; // 2 секунды
    const startTime = Date.now();
    
    const animateCounters = () => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / animationDuration, 1);
      
      // Используем эффект замедления в конце анимации
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      setDisplayedRate(targetRate * easedProgress);
      setDisplayedTotal(Math.floor(targetTotal * easedProgress));
      setDisplayedTonRate(targetTonRate * easedProgress);
      setDisplayedTonTotal(targetTonTotal * easedProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animateCounters);
      }
    };
    
    requestAnimationFrame(animateCounters);
  }, []);
  
  // Периодически добавляем эффект "всплеска" для имитации обновления значений
  useEffect(() => {
    const interval = setInterval(() => {
      if (!pulseRef.current) {
        pulseRef.current = true;
        setIsPulsing(true);
        setIsTonPulsing(true);
        
        // Через 700ms убираем эффект всплеска
        setTimeout(() => {
          pulseRef.current = false;
          setIsPulsing(false);
          setIsTonPulsing(false);
        }, 700);
      }
    }, 5000); // Каждые 5 секунд
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-card rounded-xl p-4 mb-5 shadow-lg">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-md font-medium">Текущий доход</h2>
        <div className="text-right">
          <p className={`text-lg font-semibold green-gradient-text transition-transform ${isPulsing ? 'scale-110' : 'scale-100'}`}>
            +{displayedRate.toFixed(4)} UNI / сек
            {isPulsing && (
              <span className="inline-block ml-1 animate-pulse-fade">
                <svg className="w-4 h-4 inline text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </span>
            )}
          </p>
          {displayedTonRate > 0 && (
            <p className={`text-lg font-semibold text-[#6DBFFF] transition-transform ${isTonPulsing ? 'scale-110' : 'scale-100'}`}>
              +{displayedTonRate.toFixed(5)} TON / сек
              {isTonPulsing && (
                <span className="inline-block ml-1 animate-pulse-fade">
                  <svg className="w-4 h-4 inline text-[#6DBFFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </span>
              )}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col space-y-1">
        <p className="text-sm text-foreground opacity-70">Заработано за 24 часа:</p>
        <div className="flex justify-end items-center">
          <div className="flex items-center">
            <p className={`text-md font-medium text-green-400 transition-all duration-300 ${isPulsing ? 'scale-110' : 'scale-100'}`}>
              +{displayedTotal} UNI
            </p>
            <span className="mx-2 text-gray-500">|</span>
            <p className={`text-md font-medium text-[#6DBFFF] transition-all duration-300 ${isTonPulsing ? 'scale-110' : 'scale-100'}`}>
              +{displayedTonTotal.toFixed(4)} TON
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeCard;
