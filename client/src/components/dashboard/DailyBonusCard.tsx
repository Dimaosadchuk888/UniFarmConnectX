import React, { useState, useEffect } from 'react';

const DailyBonusCard: React.FC = () => {
  // Состояние для анимаций и эффектов
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [reward, setReward] = useState('');
  const [daysStreak, setDaysStreak] = useState(3); // Условное значение для демонстрации
  
  // Создаем частицы-конфетти (только визуальный эффект)
  const confettiParticles = Array(20).fill(0).map((_, i) => ({
    id: i,
    size: Math.random() * 6 + 4,
    x: Math.random() * 90 + 5,
    y: -10 - Math.random() * 20,
    color: i % 3 === 0 ? '#A259FF' : (i % 3 === 1 ? '#00FF99' : '#B368F7'),
    velocity: {
      x: (Math.random() - 0.5) * 4,
      y: 5 + Math.random() * 3
    },
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 8
  }));
  
  // Обработка нажатия на кнопку (чисто визуальный эффект)
  const handleClaimBonus = () => {
    setShowConfetti(true);
    setReward('10 UNI');
    
    // Скрываем конфетти через 4 секунды
    setTimeout(() => {
      setShowConfetti(false);
      setReward('');
    }, 4000);
  };
  
  // Анимировать индикаторы дней
  const [animateDayIndicator, setAnimateDayIndicator] = useState<number | null>(null);
  
  useEffect(() => {
    if (showConfetti) {
      // Поочередно анимируем индикаторы дней
      for (let i = 0; i < 7; i++) {
        setTimeout(() => {
          setAnimateDayIndicator(i);
          
          // Убираем анимацию через короткое время
          setTimeout(() => {
            if (i === 6) {
              setAnimateDayIndicator(null);
            }
          }, 300);
        }, i * 150);
      }
    }
  }, [showConfetti]);
  
  return (
    <div className="bg-card rounded-xl p-4 mb-5 shadow-lg card-hover-effect relative overflow-hidden">
      {/* Фоновые декоративные элементы */}
      <div className="absolute -right-12 -top-12 w-32 h-32 bg-primary/5 rounded-full blur-xl"></div>
      <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-primary/5 rounded-full blur-xl"></div>
      
      <div className="flex justify-between items-start mb-2">
        <h2 className="text-md font-medium">Check-in</h2>
        <div className="flex items-center">
          <span className="text-xs text-foreground opacity-70 mr-2">Серия: </span>
          <span className="text-sm font-medium text-primary">{daysStreak} дн.</span>
        </div>
      </div>
      
      <p className="text-xs text-foreground opacity-70 mb-4">
        Возвращайся каждый день, чтобы собирать бонусы!
      </p>
      
      {/* Дни недели */}
      <div className="flex justify-between mb-4">
        {Array(7).fill(0).map((_, index) => {
          const isActive = index < daysStreak;
          const isAnimating = animateDayIndicator === index;
          
          return (
            <div 
              key={index} 
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs
                transition-all duration-300
                ${isActive 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-muted text-foreground opacity-60'
                }
                ${isAnimating ? 'scale-125' : ''}
              `}
            >
              {index + 1}
            </div>
          );
        })}
      </div>
      
      <button 
        className={`
          w-full py-3 rounded-lg font-medium relative overflow-hidden
          ${isButtonHovered 
            ? 'shadow-lg translate-y-[-2px]' 
            : 'shadow'
          }
          transition-all duration-300
        `}
        style={{
          background: isButtonHovered 
            ? 'linear-gradient(90deg, #A259FF 0%, #B368F7 100%)' 
            : 'linear-gradient(45deg, #A259FF 0%, #B368F7 100%)'
        }}
        onMouseEnter={() => setIsButtonHovered(true)}
        onMouseLeave={() => setIsButtonHovered(false)}
        onClick={handleClaimBonus}
      >
        {/* Эффект блеска на кнопке при наведении */}
        {isButtonHovered && (
          <div 
            className="absolute inset-0 w-full h-full" 
            style={{
              background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)',
              transform: 'translateX(-100%)',
              animation: 'shimmer 1.5s infinite'
            }}
          ></div>
        )}
        
        <span className="relative z-10 text-white">
          Получить ежедневный бонус
        </span>
      </button>
      
      {/* Конфетти при получении бонуса */}
      {showConfetti && (
        <>
          {/* Сообщение о награде */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center animate-bounce">
              <div className="text-2xl font-bold text-primary mb-2">
                +{reward}
              </div>
              <div className="text-sm text-white">
                Ежедневный бонус получен!
              </div>
            </div>
          </div>
          
          {/* Конфетти-частицы */}
          {confettiParticles.map((particle) => (
            <div
              key={particle.id}
              className="absolute"
              style={{
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                backgroundColor: particle.color,
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                transform: `rotate(${particle.rotation}deg)`,
                borderRadius: '2px',
                zIndex: 20,
                animation: `fall 3s forwards`,
                animationTimingFunction: 'ease-out',
                animationDelay: `${particle.id * 0.05}s`,
              }}
            ></div>
          ))}
        </>
      )}
    </div>
  );
};

export default DailyBonusCard;
