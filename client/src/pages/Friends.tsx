import React, { useState, useEffect } from 'react';
import ReferralLinkCard from '@/components/friends/ReferralLinkCard';
import ReferralLevelsTable from '@/components/friends/ReferralLevelsTable';

/**
 * Страница партнерской программы
 * Показывает реферальную ссылку и таблицу с уровнями партнерской программы
 */
const Friends: React.FC = () => {
  // Состояние для отслеживания видимости элементов
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Эффект появления компонентов с задержкой
  useEffect(() => {
    // Устанавливаем задержку для плавного появления
    const timeoutId = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  return (
    <div>
      <h1 
        className="text-xl font-semibold text-primary mb-6"
        style={{
          opacity: isLoaded ? 1 : 0,
          transform: `translateY(${isLoaded ? 0 : 5}px)`,
          transition: 'opacity 0.6s ease, transform 0.6s ease'
        }}
      >
        Партнёрская программа
      </h1>
      
      {/* Карточка с реферальной ссылкой */}
      <div 
        style={{
          opacity: isLoaded ? 1 : 0,
          transform: `translateY(${isLoaded ? 0 : 10}px)`,
          transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s'
        }}
      >
        <ReferralLinkCard />
      </div>
      
      {/* Таблица с уровнями партнерской программы */}
      <div 
        style={{
          opacity: isLoaded ? 1 : 0,
          transform: `translateY(${isLoaded ? 0 : 15}px)`,
          transition: 'opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s'
        }}
      >
        <ReferralLevelsTable />
      </div>
    </div>
  );
};

export default Friends;
