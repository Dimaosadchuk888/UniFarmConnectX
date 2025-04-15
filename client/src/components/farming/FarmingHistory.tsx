import React, { useState, useEffect } from 'react';

const FarmingHistory: React.FC = () => {
  // Состояние для анимации появления пустого состояния
  const [opacity, setOpacity] = useState(0);
  const [translateY, setTranslateY] = useState(20);
  
  // Анимация появления при загрузке
  useEffect(() => {
    const timer = setTimeout(() => {
      setOpacity(1);
      setTranslateY(0);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Генерируем декоративные частицы для пустого состояния
  const particles = Array(5).fill(0).map((_, i) => ({
    id: i,
    size: Math.random() * 5 + 3, // 3-8px
    top: Math.random() * 70 + 10, // 10-80%
    left: Math.random() * 80 + 10, // 10-90%
    animationDuration: Math.random() * 10 + 10, // 10-20s
    blurAmount: Math.random() * 3 + 1, // 1-4px blur
  }));
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-white">История фарминга</h2>
        <button className="text-sm text-primary hover:text-primary/80 transition-colors">
          <i className="fas fa-sync-alt mr-1"></i> Обновить
        </button>
      </div>
      
      <div 
        className="bg-card rounded-xl p-4 shadow-lg card-hover-effect relative overflow-hidden"
        style={{
          transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        {/* Декоративные частицы для визуального интереса */}
        {particles.map((particle) => (
          <div 
            key={particle.id}
            className="absolute rounded-full bg-primary/10 float-animation"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              top: `${particle.top}%`,
              left: `${particle.left}%`,
              animationDuration: `${particle.animationDuration}s`,
              filter: `blur(${particle.blurAmount}px)`,
              opacity: 0.5,
              animationDelay: `${particle.id * 0.5}s`
            }}
          ></div>
        ))}
        
        <div 
          className="text-center py-16 flex flex-col items-center justify-center"
          style={{ 
            opacity, 
            transform: `translateY(${translateY}px)`,
            transition: 'opacity 0.8s ease, transform 0.8s ease'
          }}
        >
          <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-4">
            <i className="fas fa-history text-3xl text-foreground/40"></i>
          </div>
          
          <p className="text-md text-foreground opacity-80 mb-2">
            История фарминга пуста
          </p>
          
          <p className="text-sm text-foreground opacity-50 max-w-sm mx-auto">
            Здесь будут отображаться ваши активности и доходы от фарминга
          </p>
          
          <button className="mt-6 gradient-button text-white px-4 py-2 rounded-lg font-medium transition-transform hover:scale-105">
            Начать фарминг
          </button>
        </div>
      </div>
    </div>
  );
};

export default FarmingHistory;
