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
      // Получаем guest_id из localStorage
      let guestId = '';
      try {
        // Импортируем способ получения guest_id прямо в функции
        const { getGuestId } = await import('@/services/guestIdService');
        guestId = getGuestId();
        console.log('[Friends] Получен guest_id:', guestId);
      } catch (e) {
        console.error('[Friends] Ошибка при получении guest_id:', e);
      }
      
      if (!guestId) {
        setDirectLinkData({ 
          isLoading: false, 
          refCode: '', 
          error: 'Не удалось получить guest_id' 
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
  
  // Функция для копирования ссылки в буфер обмена
  const copyDirectLinkToClipboard = () => {
    if (!directLinkData.refCode) return;
    
    try {
      const linkToCopy = `https://t.me/UniFarming_Bot/UniFarm?ref_code=${directLinkData.refCode}`;
      navigator.clipboard.writeText(linkToCopy);
      alert('Реферальная ссылка скопирована в буфер обмена');
    } catch (e) {
      console.error('[Friends] Ошибка при копировании:', e);
      
      // Fallback для браузеров без поддержки clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = `https://t.me/UniFarming_Bot/UniFarm?ref_code=${directLinkData.refCode}`;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Реферальная ссылка скопирована в буфер обмена');
      } catch (err) {
        alert('Не удалось скопировать ссылку. Скопируйте её вручную:' + 
              `https://t.me/UniFarming_Bot/UniFarm?ref_code=${directLinkData.refCode}`);
      }
    }
  };
  
  // Загружаем данные при первом рендере
  useEffect(() => {
    fetchDirectRefCode();
  }, []);
  
  // Безопасное приведение типов
  const safeUser = userData as User | undefined;
  
  // Добавляем отладочное сообщение сразу перед рендером
  console.log('[МАРКЕР FRIENDS.TSX]: Этот файл был обновлен с большой красной кнопкой');

  return (
    <div className="w-full">
      <div className="flex flex-col justify-center items-center mb-6">
        <h1 
          className="text-2xl font-bold text-green-500 mb-4"
          style={{
            opacity: isLoaded ? 1 : 0,
            transform: `translateY(${isLoaded ? 0 : 5}px)`,
            transition: 'opacity 0.6s ease, transform 0.6s ease',
            border: '2px solid green',
            padding: '10px 20px',
            borderRadius: '10px',
            backgroundColor: 'rgba(0,255,0,0.1)'
          }}
        >
          ОБНОВЛЕННЫЙ ФАЙЛ — FRIENDS.TSX — V27.04.2025
        </h1>
        
        <button 
          onClick={() => alert('Этот компонент рендерится из файла Friends.tsx!')} 
          className="animate-pulse bg-red-600 text-white py-3 px-6 rounded-lg text-lg font-bold shadow-lg mb-4"
        >
          ТЕСТОВАЯ КНОПКА ИЗ FRIENDS.TSX
        </button>
        
        {/* Кнопка для принудительного обновления данных */}
        <button 
          onClick={forceDataRefresh}
          className="bg-primary/80 hover:bg-primary text-white text-xs px-3 py-1.5 rounded-md flex items-center"
        >
          <i className="fas fa-sync-alt mr-1.5"></i>
          Обновить
        </button>
      </div>
      
      {/* Скрытый компонент для совместимости */}
      <div style={{ display: 'none' }}>
        <UniFarmReferralLink userData={userData} parentIsLoading={isLoading} parentIsError={isError} />
      </div>
      
      {/* Компонент реферальной ссылки */}
      <div className="bg-black/30 p-4 rounded-lg mb-5 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-primary font-semibold text-sm flex items-center">
            <i className="fas fa-link text-primary mr-2"></i>
            Ваша реферальная ссылка
          </h3>
          <button
            onClick={fetchDirectRefCode}
            className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-2 py-1 rounded flex items-center"
          >
            <i className="fas fa-sync-alt mr-1.5"></i>
            Обновить
          </button>
        </div>
        
        {directLinkData.isLoading ? (
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
            <span className="text-sm text-gray-300">Загрузка реферальной ссылки...</span>
          </div>
        ) : directLinkData.error ? (
          <div className="text-center py-3">
            <div className="text-amber-400 mb-2">
              <i className="fas fa-exclamation-triangle text-lg"></i>
            </div>
            <p className="text-sm text-gray-300 mb-2">{directLinkData.error}</p>
            <button
              onClick={fetchDirectRefCode}
              className="text-xs bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded"
            >
              Попробовать снова
            </button>
          </div>
        ) : directLinkData.refCode ? (
          <div>
            <div className="bg-black/40 p-3 rounded mb-3">
              <p className="text-xs text-gray-400 mb-1.5">Ваш реферальный код:</p>
              <div className="flex items-center justify-between">
                <span className="bg-primary/20 text-primary px-2 py-1 rounded font-mono text-sm">
                  {directLinkData.refCode}
                </span>
                <span className="text-xs text-gray-400">Фиксированное значение</span>
              </div>
            </div>
            
            <div className="bg-black/40 p-3 rounded mb-2">
              <p className="text-xs text-gray-400 mb-1.5">Реферальная ссылка для Telegram:</p>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={`https://t.me/UniFarming_Bot/UniFarm?ref_code=${directLinkData.refCode}`}
                  className="w-full bg-gray-800 text-sm p-2 pr-10 rounded text-gray-200 font-mono"
                />
                <button
                  onClick={copyDirectLinkToClipboard}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <i className="fas fa-copy"></i>
                </button>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 text-center mt-2 px-1">
              Отправьте эту ссылку друзьям, чтобы получать бонусы от их активности
            </p>
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-sm text-gray-300 mb-2">Реферальный код не найден</p>
            <button
              onClick={fetchDirectRefCode}
              className="text-xs bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded"
            >
              Получить код
            </button>
          </div>
        )}
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
