import React, { useState, useEffect } from 'react';
import UniFarmReferralLink from '@/components/friends/UniFarmReferralLink'; // Основной компонент для отображения ссылки
import ReferralLevelsTable from '@/components/friends/ReferralLevelsTable';
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
 * 
 * Исправлено для телеграм: устранен черный экран при работе в Telegram WebApp
 */
const Friends: React.FC = () => {
  // Состояние для отслеживания видимости элементов
  const [isLoaded, setIsLoaded] = useState(true); // Сразу показываем компоненты
  
  // Получаем информацию о пользователе без принудительного обновления
  // чтобы избежать мерцания и черного экрана в Telegram
  const { data: userData, isLoading, isError } = useQuery({
    queryKey: ['/api/me'], 
    queryFn: () => userService.getCurrentUser(false), // Используем кэшированные данные если есть
    staleTime: 30000, // Увеличиваем время кэширования для стабильности
    refetchOnWindowFocus: false, // Отключаем автообновление при фокусе для стабильности в Telegram
    retry: 1, // Ограничиваем количество повторных запросов
  });
  
  // Эффект для логирования данных пользователя
  useEffect(() => {
    // Для аудита логируем полученный ref_code
    if (userData?.ref_code) {
      console.log('[Friends] АУДИТ: получен ref_code:', userData.ref_code);
    } else if (!isLoading && userData) {
      console.warn('[Friends] АУДИТ: ref_code отсутствует в данных пользователя:', {
        hasUserData: !!userData,
        userId: userData?.id,
        telegramId: userData?.telegram_id
      });
    }
  }, [userData, isLoading]);
  
  // Фиксируем возможную проблему с ref_code
  useEffect(() => {
    // Если данные пользователя загружены, но ref_code отсутствует
    if (userData && !userData.ref_code && !isLoading) {
      console.log('[Friends] Запрос обновления данных пользователя из-за отсутствия ref_code');
      // Пробуем получить обновленные данные через 1 секунду
      const timer = setTimeout(() => {
        userService.getCurrentUser(true)
          .then(updatedUser => {
            if (updatedUser && updatedUser.ref_code) {
              console.log('[Friends] Успешно получен ref_code после обновления:', updatedUser.ref_code);
              // Принудительно обновляем данные
              window.dispatchEvent(new CustomEvent('user:updated', { detail: updatedUser }));
            }
          })
          .catch(err => console.error('[Friends] Ошибка при обновлении данных пользователя:', err));
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [userData, isLoading]);
  
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
      
      {/* Карточка с реферальной ссылкой - передаем данные пользователя напрямую */}
      <div 
        style={{
          opacity: isLoaded ? 1 : 0,
          transform: `translateY(${isLoaded ? 0 : 10}px)`,
          transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s'
        }}
      >
        {/* Передаем userData напрямую для синхронизации */}
        <UniFarmReferralLink userData={userData} parentIsLoading={isLoading} parentIsError={isError} />
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
