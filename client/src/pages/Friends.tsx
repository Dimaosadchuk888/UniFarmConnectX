import React, { useState, useEffect } from 'react';
import ReferralLinkCard from '@/components/friends/ReferralLinkCard';
import ReferralLevelsTable from '@/components/friends/ReferralLevelsTable';
import { useQuery } from '@tanstack/react-query';
import userService from '@/services/userService';

/**
 * Тестовый блок для аудита ref_code
 * Отображается только в режиме разработки
 */
const RefCodeAuditBlock = ({userData, isLoading}) => {
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="bg-black/30 rounded-lg p-3 mb-4 text-sm overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-primary font-bold">
          Тестовый блок аудита <span className="text-white/60 text-xs">(скрыто в production)</span>
        </h3>
        <div className="text-xs px-2 py-1 rounded bg-green-900/30 text-green-500">
          {!isLoading ? 'Данные загружены' : 'Загрузка...'}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
        <div>
          <span className="text-gray-500">ID пользователя:</span>
          <span className="ml-2 text-white">{userData?.id || 'не загружен'}</span>
        </div>
        <div>
          <span className="text-gray-500">Telegram ID:</span>
          <span className="ml-2 text-white">{userData?.telegram_id || 'не загружен'}</span>
        </div>
        <div>
          <span className="text-gray-500">ref_code:</span>
          <span className="ml-2 text-accent">{userData?.ref_code || 'НЕ НАЗНАЧЕН'}</span>
        </div>
        <div>
          <span className="text-gray-500">Время:</span>
          <span className="ml-2 text-white">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
      
      {/* Прямое отображение реферальной ссылки с подсветкой */}
      <div className="mt-2 py-2 px-3 bg-black/30 rounded overflow-auto">
        <p className="text-xs text-white mb-1">Реферальная ссылка (прямое отображение):</p>
        {userData?.ref_code ? (
          <code className="text-xs text-accent break-all">
            https://t.me/UniFarmingBot/app?startapp=ref_{userData.ref_code}
          </code>
        ) : (
          <code className="text-xs text-red-400 break-all">
            Ссылка не может быть сгенерирована: ref_code отсутствует
          </code>
        )}
      </div>
    </div>
  );
};

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
      
      {/* Тестовый блок аудита */}
      <RefCodeAuditBlock userData={userData} isLoading={isLoading} />
      
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
