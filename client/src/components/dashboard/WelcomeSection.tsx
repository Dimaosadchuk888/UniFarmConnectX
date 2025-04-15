import React, { useState, useEffect } from 'react';

const WelcomeSection: React.FC = () => {
  // Эффекты для анимации появления и мотивационных фраз
  const [isVisible, setIsVisible] = useState(false);
  const [currentMotivation, setCurrentMotivation] = useState(0);
  
  // Массив мотивационных фраз для циклической смены
  const motivationalPhrases = [
    "Сегодня отличный день для добычи токенов!",
    "UNI токены ждут тебя! Начни фарминг прямо сейчас.",
    "Приглашай друзей и зарабатывай еще больше!",
    "Твой крипто-урожай становится все больше!"
  ];
  
  // Плавное появление при загрузке
  useEffect(() => {
    setIsVisible(true);
    
    // Циклическая смена мотивационных фраз
    const intervalId = setInterval(() => {
      setCurrentMotivation(prev => (prev + 1) % motivationalPhrases.length);
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Время приветствия в зависимости от времени суток
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return "Доброй ночи";
    if (hour < 12) return "Доброе утро";
    if (hour < 18) return "Добрый день";
    return "Добрый вечер";
  };
  
  // Стилизованное имя пользователя 
  const getUsername = () => {
    return (
      <span className="relative">
        <span className="relative z-10">@username</span>
        <span 
          className="absolute -bottom-1 left-0 w-full h-2 bg-primary/20 rounded-full z-0" 
          style={{ transform: 'rotate(-1deg)' }}
        ></span>
      </span>
    );
  };
  
  // Анимация смены мотивационных фраз
  const [phraseAnimation, setPhraseAnimation] = useState('fade-in');
  
  useEffect(() => {
    // Сначала анимация выхода
    setPhraseAnimation('fade-out');
    
    // Затем, через короткий промежуток времени, анимация входа
    const timeout = setTimeout(() => {
      setPhraseAnimation('fade-in');
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [currentMotivation]);
  
  return (
    <div 
      className="mb-6 relative"
      style={{ 
        opacity: isVisible ? 1 : 0,
        transform: `translateY(${isVisible ? 0 : 20}px)`,
        transition: 'opacity 0.8s ease, transform 0.8s ease'
      }}
    >
      {/* Декоративные элементы */}
      <div className="absolute -top-6 -left-6 w-12 h-12 bg-primary/10 rounded-full blur-md"></div>
      <div className="absolute top-8 right-10 w-6 h-6 bg-accent/10 rounded-full blur-sm"></div>
      
      <h1 className="text-xl font-semibold text-white relative">
        {getTimeBasedGreeting()}, {getUsername()}!
        
        {/* Маленькая декоративная иконка */}
        <span className="absolute -right-4 top-1 text-primary/70 text-xs">
          <i className="fas fa-bolt"></i>
        </span>
      </h1>
      
      <div className="h-6 relative">
        <p 
          className={`text-sm text-foreground opacity-80 absolute transition-all duration-500 ${phraseAnimation === 'fade-in' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
        >
          {motivationalPhrases[currentMotivation]}
        </p>
      </div>
      
      {/* Индикатор точек для текущей фразы */}
      <div className="flex space-x-1 mt-3">
        {motivationalPhrases.map((_, index) => (
          <div 
            key={index}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              index === currentMotivation 
                ? 'bg-primary w-3' 
                : 'bg-primary/20'
            }`}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default WelcomeSection;
