import React, { useState, useEffect } from 'react';
import UniFarmReferralLink from '@/components/friends/UniFarmReferralLink'; // Основной компонент для отображения ссылки
// Используем отладочную версию таблицы для проверки проблемы
import ReferralLevelsTable from '@/components/friends/ReferralLevelsTable.debug';
import { useQuery } from '@tanstack/react-query';
import userService from '@/services/userService';
import { User } from '@/services/userService';

/**
 * Страница партнерской программы
 * Показывает реферальную ссылку и таблицу с уровнями партнерской программы
 * 
 * АУДИТ ЭТАП 4.1: Объединенная версия Friends и FriendsMinimal.
 * Удалена проверка на минимальный режим, добавлена статистика реферального кода, 
 * стабильная работа в любой среде запуска.
 */
const Friends: React.FC = () => {
  // Состояние для отслеживания видимости элементов
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Получаем информацию о пользователе - принудительно отключаем кэширование
  const { data: userData, isLoading, isError } = useQuery({
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
  
  // Безопасное приведение типов
  const safeUser = userData as User | undefined;
  
  return (
    <div className="w-full">
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
      
      {/* Карточка с реферальной ссылкой - единственный компонент по итогам аудита */}
      <div 
        style={{
          opacity: isLoaded ? 1 : 0,
          transform: `translateY(${isLoaded ? 0 : 10}px)`,
          transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s'
        }}
      >
        <UniFarmReferralLink />
      </div>
      
      {/* Статистика реферального кода */}
      <div
        className="bg-black/30 rounded-lg p-3 mb-4 mt-4"
        style={{
          opacity: isLoaded ? 1 : 0,
          transform: `translateY(${isLoaded ? 0 : 12}px)`,
          transition: 'opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s'
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-primary font-bold text-sm">
            Статистика вашего реферального кода
          </h3>
          <div className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-300">
            {isLoading ? 'загрузка' : (isError ? 'ошибка' : 'готово')}
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="flex justify-between bg-black/20 p-2 rounded">
            <span className="text-gray-400">ID пользователя:</span>
            <span className="text-white font-mono">{safeUser?.id || '—'}</span>
          </div>
          <div className="flex justify-between bg-black/20 p-2 rounded">
            <span className="text-gray-400">Telegram ID:</span>
            <span className="text-white font-mono">{safeUser?.telegram_id || '—'}</span>
          </div>
          <div className="flex justify-between bg-black/20 p-2 rounded">
            <span className="text-gray-400">Реферальный код:</span>
            <span className="text-accent font-mono font-bold">{safeUser?.ref_code || 'НЕ НАЗНАЧЕН'}</span>
          </div>
          <div className="flex justify-between bg-black/20 p-2 rounded">
            <span className="text-gray-400">Приглашенных друзей:</span>
            <span className="text-white font-mono">0</span>
          </div>
        </div>
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
