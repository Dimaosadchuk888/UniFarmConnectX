import React, { useState, useEffect } from 'react';
import ReferralLinkCard from '@/components/friends/ReferralLinkCard';
import ReferralLevelsTable from '@/components/friends/ReferralLevelsTable';
import { useQuery } from '@tanstack/react-query';
import userService from '@/services/userService';
import { getCachedTelegramUserId } from '@/services/telegramService';
import { getTelegramUserId } from '@/services/telegramInitData';

// Диагностический блок удален

// Второй диагностический блок удален

/**
 * Страница партнерской программы
 * Показывает реферальную ссылку и таблицу с уровнями партнерской программы
 */
const Friends: React.FC = () => {
  // Состояние для отслеживания видимости элементов
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Получаем информацию о пользователе для тестового блока
  const { data: userData, isLoading } = useQuery({
    queryKey: ['/api/me'], 
    queryFn: () => userService.getCurrentUser(),
    staleTime: 30000
  });
  
  // Эффект появления компонентов с задержкой
  useEffect(() => {
    // Устанавливаем задержку для плавного появления
    const timeoutId = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    
    // Для аудита логируем полученный ref_code
    if (userData?.ref_code) {
      console.log('[Friends] АУДИТ: получен ref_code:', userData.ref_code);
    } else {
      console.warn('[Friends] АУДИТ: ref_code отсутствует в данных пользователя');
    }
    
    return () => clearTimeout(timeoutId);
  }, [userData?.ref_code]);
  
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
      
      {/* Диагностические блоки удалены */}
      
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
