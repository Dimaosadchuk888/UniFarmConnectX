import React, { useState, useEffect } from 'react';
import UniFarmReferralLink from '@/components/friends/UniFarmReferralLink';
import ReferralLevelsTable from '@/components/friends/ReferralLevelsTable';
import { useQuery } from '@tanstack/react-query';
import userService from '@/services/userService';
import type { User } from '@/services/userService';
import { queryClient } from '@/lib/queryClient';

/**
 * Страница партнерской программы
 * Показывает реферальную ссылку и таблицу с уровнями партнерской программы
 */
const Friends: React.FC = () => {
  // Состояние для отслеживания видимости элементов
  const [isLoaded, setIsLoaded] = useState(true);
  
  // Отладочная отметка в консоли
  console.log('[Friends] Компонент страницы партнерской программы');
  
  // Получаем информацию о пользователе с принудительным обновлением
  const { data: userData, isLoading, isError, refetch } = useQuery<User>({
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
    console.log('[Friends] Состояние компонента:', {
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
    } catch (error) {
      console.error('[Friends] Ошибка доступа к localStorage:', error);
    }
  }, [userData, isLoading, isError]);

  // Эффект для автоматической генерации реферального кода, если он отсутствует
  useEffect(() => {
    // Только если данные загружены и ref_code отсутствует
    if (!isLoading && userData && !userData.ref_code) {
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
  
  // Добавляем состояние для прямого доступа к ссылке
  const [directLinkData, setDirectLinkData] = useState({
    isLoading: false,
    refCode: '',
    error: ''
  });

  // Функция для прямого получения реферального кода
  const fetchDirectRefCode = async () => {
    setDirectLinkData({ isLoading: true, refCode: '', error: '' });
    
    try {
      // Получаем guest_id пользователя
      const guestId = localStorage.getItem('unifarm_guest_id');
      
      if (!guestId) {
        console.error('[Friends] Не удалось получить guest_id из localStorage');
        setDirectLinkData({ 
          isLoading: false, 
          refCode: '', 
          error: 'Не удалось получить идентификатор гостя' 
        });
        return;
      }
      
      // Делаем прямой запрос к API для получения пользователя по guest_id
      const response = await fetch(`/api/users/guest/${guestId}`);
      const data = await response.json();
      
      console.log('[Friends] Прямой запрос к API:', data);
      
      if (data.success && data.data && data.data.ref_code) {
        setDirectLinkData({ 
          isLoading: false, 
          refCode: data.data.ref_code, 
          error: '' 
        });
      } else if (data.success && data.data && !data.data.ref_code) {
        // Если нет ref_code, пробуем генерировать
        const genResponse = await fetch('/api/users/generate-refcode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: data.data.id })
        });
        
        const genData = await genResponse.json();
        
        if (genData.success && genData.data && genData.data.ref_code) {
          setDirectLinkData({ 
            isLoading: false, 
            refCode: genData.data.ref_code, 
            error: '' 
          });
        } else {
          setDirectLinkData({ 
            isLoading: false, 
            refCode: '', 
            error: 'Не удалось сгенерировать реферальный код' 
          });
        }
      } else {
        setDirectLinkData({ 
          isLoading: false, 
          refCode: '', 
          error: data.message || 'Не удалось получить данные пользователя' 
        });
      }
    } catch (error) {
      console.error('[Friends] Ошибка при прямом запросе реферального кода:', error);
      setDirectLinkData({ 
        isLoading: false, 
        refCode: '', 
        error: (error as Error).message || 'Произошла ошибка при запросе данных' 
      });
    }
  };
  
  // Загружаем данные при первом рендере
  useEffect(() => {
    fetchDirectRefCode();
  }, []);
  
  // Безопасное приведение типов
  const safeUser = userData as User | undefined;

  return (
    <div className="w-full">
      <div className="flex flex-col justify-center items-center mb-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-purple-500 mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Партнёрская программа UniFarm
          </h1>
          <p className="text-gray-400 text-sm">
            Приглашайте друзей и получайте бонусы
          </p>
        </div>
        
        {/* Блок со статистикой "Ваш реферальный код" удален согласно ТЗ от 28 апреля 2025 */}
        
        {/* Кнопка обновления данных */}
        <button 
          onClick={forceDataRefresh}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg shadow mb-4 flex items-center space-x-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Обновить данные</span>
        </button>
      </div>
      
      {/* Основной компонент реферальной ссылки */}
      <div className="mb-8">
        <UniFarmReferralLink />
      </div>
      
      {/* Таблица уровней партнёрской программы */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4 text-center">
          Уровни партнёрской программы
        </h3>
        <ReferralLevelsTable />
      </div>
      
      {/* Бонусный блок с анимацией */}
      <div className="w-full p-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg shadow-lg mb-6 relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-xl text-white font-bold mb-2">Приглашайте друзей и зарабатывайте!</h3>
          <p className="text-white text-sm mb-3">
            С каждого заработка ваших рефералов вы получаете бонус.
            Строите сеть до 20 уровней в глубину!
          </p>
        </div>
        {/* Декоративный элемент (пузырьки) */}
        <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-yellow-300 opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full bg-orange-300 opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>
    </div>
  );
};

export default Friends;