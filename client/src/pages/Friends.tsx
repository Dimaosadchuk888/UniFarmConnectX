import React, { useState, useEffect } from 'react';
import ReferralLinkCard from '@/components/friends/ReferralLinkCard';
import ReferralLevelsTable from '@/components/friends/ReferralLevelsTable';
import { useQuery } from '@tanstack/react-query';
import userService from '@/services/userService';
import { getCachedTelegramUserId } from '@/services/telegramService';
import { getTelegramUserId } from '@/services/telegramInitData';

/**
 * Компонент для аудита вывода ref_code и Telegram ID
 * Безусловно отображается во всех режимах (включая production)
 */
const TelegramKeyInfoBlock = () => {
  // Для диагностики получаем ref_code и telegramId из разных источников
  const [telegramData, setTelegramData] = useState<{
    userId: string | number | null,
    refCode: string | null,
    source: string
  }>({
    userId: null,
    refCode: null,
    source: 'загрузка...'
  });
  
  // Запрос на получение данных пользователя
  const { data: userData } = useQuery({
    queryKey: ['/api/me'], 
    queryFn: () => userService.getCurrentUser(),
    staleTime: 10000
  });
  
  useEffect(() => {
    // Соберем все возможные источники telegramId и ref_code
    const telegramId = getTelegramUserId();
    const cachedId = getCachedTelegramUserId();
    const telegramWebAppId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const userDataId = userData?.telegram_id;
    
    // Выбираем лучший доступный источник
    let bestId = telegramId || telegramWebAppId || userDataId || cachedId || null;
    let source = 'неизвестно';
    
    if (telegramId) source = 'telegramInitData.getTelegramUserId()';
    else if (telegramWebAppId) source = 'window.Telegram.WebApp';
    else if (userDataId) source = 'userData.telegram_id';
    else if (cachedId) source = 'cachedTelegramUserId';
    
    setTelegramData({
      userId: bestId,
      refCode: userData?.ref_code || null,
      source
    });
    
    console.log('[AUDIT_BLOCK] Найденные данные:', {
      telegramId,
      telegramWebAppId,
      userDataId,
      cachedId,
      refCode: userData?.ref_code
    });
  }, [userData]);
  
  // Определяем статус соединения с Telegram
  const telegramStatus = window.Telegram?.WebApp?.initData ? "OK" : "Не подключен";
  
  // Отображаем блок в любом случае, независимо от режима или наличия данных
  return (
    <div className="bg-amber-800/20 border border-amber-500/30 rounded-md p-3 mb-4 overflow-hidden">
      <div className="text-center mb-2">
        <span className="font-bold text-amber-400">ТЕЛЕГРАМ ДИАГНОСТИКА</span>
      </div>
      
      <div className="text-white text-sm leading-relaxed">
        <div>
          Ваш ref_code: <span className="text-amber-300 font-mono">{telegramData.refCode || "не получен"}</span>
        </div>
        <div>
          Telegram ID: <span className="text-amber-300 font-mono">{telegramData.userId || "не получен"}</span>
        </div>
        <div>
          initData status: <span className={`font-mono ${telegramStatus === "OK" ? "text-green-400" : "text-red-400"}`}>{telegramStatus}</span>
        </div>
        <div>
          Источник ID: <span className="text-xs opacity-75 font-mono">{telegramData.source}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Тестовый блок для аудита ref_code (только режим разработки)
 */
const RefCodeAuditBlock = ({userData, isLoading}: {userData: any, isLoading: boolean}) => {
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
      
      {/* Диагностический блок - виден всегда, включая production */}
      <TelegramKeyInfoBlock />
      
      {/* Расширенный тестовый блок аудита - только для режима разработки */}
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
