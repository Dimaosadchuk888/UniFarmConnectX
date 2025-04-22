import React, { useState, useEffect } from 'react';
import UniFarmReferralLink from '@/components/friends/UniFarmReferralLink'; // Новый улучшенный компонент
import ReferralDirectLinkCard from '@/components/friends/ReferralDirectLinkCard'; // Дополнительный компонент для отображения ссылки
import ReferralLevelsTable from '@/components/friends/ReferralLevelsTable';
import { useQuery } from '@tanstack/react-query';
import userService from '@/services/userService';

/**
 * Страница партнерской программы
 * Показывает реферальную ссылку и таблицу с уровнями партнерской программы
 * 
 * ВАЖНО: Обновлена для использования нового компонента UniFarmReferralLink,
 * который имеет упрощенную логику отображения ссылки, зависящую только от наличия ref_code.
 */
const Friends: React.FC = () => {
  // Состояние для отслеживания видимости элементов
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Получаем информацию о пользователе - принудительно отключаем кэширование
  const { data: userData, isLoading } = useQuery({
    queryKey: ['/api/me'], 
    queryFn: () => userService.getCurrentUser(true), // Принудительно получаем свежие данные
    staleTime: 10000, // Уменьшаем время кэширования до 10 секунд
    refetchOnWindowFocus: true // Обновляем при возврате на вкладку
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
    } else if (!isLoading) {
      console.warn('[Friends] АУДИТ: ref_code отсутствует в данных пользователя:', {
        hasUserData: !!userData,
        userId: userData?.id,
        telegramId: userData?.telegram_id
      });
    }
    
    return () => clearTimeout(timeoutId);
  }, [userData?.ref_code, isLoading, userData]);
  
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
      
      {/* Карточка с реферальной ссылкой - обновлена на новый компонент */}
      <div 
        style={{
          opacity: isLoaded ? 1 : 0,
          transform: `translateY(${isLoaded ? 0 : 10}px)`,
          transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s'
        }}
      >
        <UniFarmReferralLink />
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
      
      {/* Дополнительный независимый блок с реферальной ссылкой */}
      <div 
        style={{
          opacity: isLoaded ? 1 : 0,
          transform: `translateY(${isLoaded ? 0 : 20}px)`,
          transition: 'opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s'
        }}
      >
        <ReferralDirectLinkCard />
      </div>
    </div>
  );
};

export default Friends;
