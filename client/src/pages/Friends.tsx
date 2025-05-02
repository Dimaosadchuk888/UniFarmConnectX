import React, { useState, useEffect } from 'react';
import UniFarmReferralLink from '@/components/friends/UniFarmReferralLink';
import ReferralLevelsTable from '@/components/friends/ReferralLevelsTable';
import { useQuery } from '@tanstack/react-query';
import userService from '@/services/userService';
import type { User } from '@/services/userService';
import { queryClient } from '@/lib/queryClient';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

/**
 * Страница партнерской программы
 * Показывает реферальную ссылку и таблицу с уровнями партнерской программы
 */
const Friends: React.FC = () => {
  // Состояние для отслеживания видимости элементов
  const [isLoaded, setIsLoaded] = useState(true);
  
  // Получаем информацию о пользователе с принудительным обновлением
  const { data: userData, isLoading, isError, refetch } = useQuery<User>({
    queryKey: ['/api/me'], 
    queryFn: () => userService.getCurrentUser(true), // Принудительно обновляем данные
    staleTime: 0, // Отключаем кэширование для получения свежих данных
    refetchOnWindowFocus: true, // Включаем обновление при фокусе окна
    retry: 3, // Увеличиваем количество повторных запросов
    refetchInterval: 5000 // Автоматически обновляем данные каждые 5 секунд
  });

  // Эффект для отслеживания изменений данных пользователя
  useEffect(() => {
    // Этот эффект пустой, но готов к добавлению функциональности при необходимости
  }, [userData, isLoading, isError]);

  // Эффект для автоматической генерации реферального кода, если он отсутствует
  // с улучшенной обработкой ошибок
  useEffect(() => {
    // Только если данные загружены и ref_code отсутствует
    if (!isLoading && userData && !userData.ref_code) {
      console.log('Обнаружен пользователь без реферального кода, попытка автогенерации');
      
      // Немедленно пытаемся сгенерировать реферальный код без задержки
      userService.generateRefCode()
        .then(() => {
          console.log('Успешно сгенерирован реферальный код');
          // Принудительно обновляем данные в интерфейсе
          try {
            refetch()
              .catch(refetchError => {
                console.error('Ошибка при обновлении данных после генерации кода:', refetchError);
              });
          } catch (refetchError) {
            console.error('Необработанная ошибка при вызове refetch:', refetchError);
          }
        })
        .catch((genError) => {
          console.error('Не удалось сгенерировать реферальный код:', genError);
          
          // Переходим к запасному варианту - запрашиваем просто обновление данных
          userService.getCurrentUser(true)
            .then(updatedUser => {
              console.log('Получены обновленные данные пользователя');
              
              // Принудительно обновляем данные
              try {
                window.dispatchEvent(new CustomEvent('user:updated', { detail: updatedUser }));
              } catch (eventError) {
                console.error('Ошибка при отправке события обновления:', eventError);
              }
              
              try {
                refetch()
                  .catch(refetchError => {
                    console.error('Ошибка при обновлении данных с сервера:', refetchError);
                  });
              } catch (refetchError) {
                console.error('Необработанная ошибка при вызове refetch:', refetchError);
              }
            })
            .catch(userError => {
              console.error('Не удалось получить обновленные данные пользователя:', userError);
            });
        });
    }
  }, [userData, isLoading, refetch]);
  
  // Функция для принудительного обновления данных с улучшенной обработкой ошибок
  const forceDataRefresh = async () => {
    try {
      // Принудительно запрашиваем свежие данные
      const updatedUser = await userService.getCurrentUser(true);
      
      // Обновляем UI через событие
      window.dispatchEvent(new CustomEvent('user:updated', { detail: updatedUser }));
      
      // Затем обновляем React Query кэш
      try {
        await refetch();
      } catch (refetchError) {
        console.error('Ошибка при обновлении данных через refetch:', refetchError);
        // Продолжаем выполнение, даже если refetch не удался
      }
      
      // Если кода все равно нет - пробуем генерировать
      if (updatedUser && !updatedUser.ref_code) {
        try {
          await userService.generateRefCode();
          try {
            await refetch();
          } catch (refetchError) {
            console.error('Ошибка при обновлении данных после генерации кода:', refetchError);
          }
        } catch (genError) {
          console.error('Не удалось сгенерировать реферальный код:', genError);
          // Тихая обработка ошибки для пользователя
        }
      }
    } catch (error) {
      console.error('Ошибка при обновлении данных пользователя:', error);
      // Тихая обработка ошибки для пользователя, но логирование для отладки
    }
  };
  
  // Добавляем состояние для прямого доступа к ссылке
  const [directLinkData, setDirectLinkData] = useState({
    isLoading: false,
    refCode: '',
    error: ''
  });

  // Функция для прямого получения реферального кода с улучшенной обработкой ошибок
  const fetchDirectRefCode = async () => {
    setDirectLinkData({ isLoading: true, refCode: '', error: '' });
    
    try {
      // Получаем guest_id пользователя с защитой от ошибок
      let guestId;
      try {
        guestId = localStorage.getItem('unifarm_guest_id');
      } catch (storageError) {
        console.error('Ошибка при доступе к localStorage:', storageError);
        setDirectLinkData({ 
          isLoading: false, 
          refCode: '', 
          error: 'Не удалось получить данные из локального хранилища' 
        });
        return;
      }
      
      if (!guestId) {
        console.warn('guest_id отсутствует в localStorage');
        setDirectLinkData({ 
          isLoading: false, 
          refCode: '', 
          error: 'Не удалось получить идентификатор гостя' 
        });
        return;
      }
      
      // Делаем прямой запрос к API для получения пользователя по guest_id
      let response, data;
      try {
        response = await fetch(`/api/users/guest/${guestId}`);
        data = await response.json();
      } catch (fetchError) {
        console.error('Ошибка при запросе данных пользователя:', fetchError);
        setDirectLinkData({ 
          isLoading: false, 
          refCode: '', 
          error: 'Не удалось подключиться к серверу' 
        });
        return;
      }
      
      if (data.success && data.data && data.data.ref_code) {
        setDirectLinkData({ 
          isLoading: false, 
          refCode: data.data.ref_code, 
          error: '' 
        });
      } else if (data.success && data.data && !data.data.ref_code) {
        // Если нет ref_code, пробуем генерировать
        try {
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
            console.warn('Неуспешный ответ при генерации кода:', genData);
            setDirectLinkData({ 
              isLoading: false, 
              refCode: '', 
              error: genData.message || 'Не удалось сгенерировать реферальный код' 
            });
          }
        } catch (genError) {
          console.error('Ошибка при генерации реферального кода:', genError);
          setDirectLinkData({ 
            isLoading: false, 
            refCode: '', 
            error: 'Ошибка при генерации реферального кода' 
          });
        }
      } else {
        console.warn('Неуспешный ответ при получении пользователя:', data);
        setDirectLinkData({ 
          isLoading: false, 
          refCode: '', 
          error: data.message || 'Не удалось получить данные пользователя' 
        });
      }
    } catch (error) {
      console.error('Необработанная ошибка в fetchDirectRefCode:', error);
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
      <ErrorBoundary fallback={<div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 my-4">Не удалось загрузить интерфейс партнерской программы</div>}>
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
      </ErrorBoundary>
      
      {/* Основной компонент реферальной ссылки */}
      <ErrorBoundary fallback={<div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 my-4">Не удалось загрузить реферальную ссылку</div>}>
        <div className="mb-8">
          <UniFarmReferralLink />
        </div>
      </ErrorBoundary>
      
      {/* Таблица уровней партнёрской программы */}
      <ErrorBoundary fallback={<div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 my-4">Не удалось загрузить таблицу уровней партнёрской программы</div>}>
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4 text-center">
            Уровни партнёрской программы
          </h3>
          <ReferralLevelsTable />
        </div>
      </ErrorBoundary>
      
      {/* Бонусный блок с анимацией */}
      <ErrorBoundary fallback={<div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 my-4">Не удалось загрузить информацию о бонусах</div>}>
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
      </ErrorBoundary>
    </div>
  );
};

export default Friends;