import React, { useState, useEffect } from 'react';
import UniFarmReferralLink from '@/components/friends/UniFarmReferralLink'; // Основной компонент для отображения ссылки
import ReferralLevelsTable from '@/components/friends/ReferralLevelsTable';
import { useQuery } from '@tanstack/react-query';
import userService from '@/services/userService';
import type { User } from '@/services/userService';

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
  
  // Получаем информацию о пользователе с принудительным обновлением
  // для обеспечения актуальности данных
  const { data: userData, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/me'], 
    queryFn: () => userService.getCurrentUser(true), // Принудительно обновляем данные
    staleTime: 0, // Отключаем кэширование для получения свежих данных
    refetchOnWindowFocus: true, // Включаем обновление при фокусе окна
    retry: 3, // Увеличиваем количество повторных запросов
    refetchInterval: 5000 // Автоматически обновляем данные каждые 5 секунд
  });
  
  // Эффект для логирования данных пользователя
  useEffect(() => {
    // Подробное логирование для отладки
    console.log('[Friends] Состояние компонента Friends:', {
      hasUserData: !!userData,
      isLoading,
      isError,
      userData: userData ? {
        id: userData.id,
        guest_id: userData.guest_id,
        ref_code: userData.ref_code || 'ОТСУТСТВУЕТ',
        username: userData.username
      } : 'НЕТ ДАННЫХ'
    });
    
    // Специальное логирование для реферального кода
    if (userData?.ref_code) {
      console.log('[Friends] АУДИТ: получен ref_code:', userData.ref_code);
    } else if (!isLoading && userData) {
      console.warn('[Friends] АУДИТ: ref_code отсутствует в данных пользователя:', {
        hasUserData: !!userData,
        userId: userData?.id,
        telegramId: userData?.telegram_id,
        guest_id: userData?.guest_id
      });
    }
    
    // Проверяем localStorage для диагностики
    try {
      const localStorageKeys = Object.keys(localStorage);
      console.log('[Friends] Данные localStorage:', localStorageKeys.map(key => 
        `${key}: ${localStorage.getItem(key)?.substring(0, 30)}...`
      ));
    } catch (e) {
      console.error('[Friends] Ошибка при доступе к localStorage:', e);
    }
  }, [userData, isLoading, isError]);
  
  // Фиксируем возможную проблему с ref_code
  useEffect(() => {
    // Если данные пользователя загружены, но ref_code отсутствует
    if (userData && !userData.ref_code && !isLoading) {
      console.log('[Friends] Обнаружено отсутствие ref_code, запускаем генерацию');
      
      // Немедленно пытаемся сгенерировать реферальный код без задержки
      userService.generateRefCode()
        .then(refCode => {
          console.log('[Friends] Успешно сгенерирован реферальный код:', refCode);
          
          // Принудительно обновляем данные в интерфейсе
          refetch().then(() => {
            console.log('[Friends] UI обновлен после генерации кода');
          });
        })
        .catch(err => {
          console.error('[Friends] Ошибка генерации реферального кода:', err);
          
          // Переходим к запасному варианту - запрашиваем просто обновление данных
          userService.getCurrentUser(true)
            .then(updatedUser => {
              console.log('[Friends] Получены обновленные данные:', { 
                hasRefCode: !!updatedUser?.ref_code,
                refCode: updatedUser?.ref_code
              });
              
              // Принудительно обновляем данные
              window.dispatchEvent(new CustomEvent('user:updated', { detail: updatedUser }));
              refetch();
            });
        });
    }
  }, [userData, isLoading, refetch]);
  
  // Добавляем функцию для принудительного обновления данных
  const forceDataRefresh = async () => {
    console.log('[Friends] Принудительное обновление данных');
    
    try {
      // Принудительно запрашиваем свежие данные
      const updatedUser = await userService.getCurrentUser(true);
      console.log('[Friends] Данные обновлены:', {
        hasData: !!updatedUser, 
        refCode: updatedUser?.ref_code || 'НЕ ПОЛУЧЕН'
      });
      
      // Обновляем UI через событие
      window.dispatchEvent(new CustomEvent('user:updated', { detail: updatedUser }));
      
      // Затем обновляем React Query кэш
      refetch();
      
      // Если кода все равно нет - пробуем генерировать
      if (updatedUser && !updatedUser.ref_code) {
        console.log('[Friends] После обновления реферальный код все еще отсутствует, запускаем генерацию');
        
        try {
          const code = await userService.generateRefCode();
          console.log('[Friends] Код успешно сгенерирован:', code);
          refetch();
        } catch (genError) {
          console.error('[Friends] Ошибка генерации кода:', genError);
        }
      }
    } catch (error) {
      console.error('[Friends] Ошибка при принудительном обновлении:', error);
    }
  };
  
  // Безопасное приведение типов
  const safeUser = userData as User | undefined;
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 
          className="text-xl font-semibold text-primary"
          style={{
            opacity: isLoaded ? 1 : 0,
            transform: `translateY(${isLoaded ? 0 : 5}px)`,
            transition: 'opacity 0.6s ease, transform 0.6s ease'
          }}
        >
          Партнёрская программа
        </h1>
        
        {/* Кнопка для принудительного обновления данных */}
        <button 
          onClick={forceDataRefresh}
          className="bg-primary/80 hover:bg-primary text-white text-xs px-3 py-1.5 rounded-md flex items-center"
        >
          <i className="fas fa-sync-alt mr-1.5"></i>
          Обновить
        </button>
      </div>
      
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
