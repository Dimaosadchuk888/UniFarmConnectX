import React, { useState, useEffect, useCallback } from 'react';
import userService, { User } from '@/services/userService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { requestInitData } from '@/services/telegramService';
import FallbackReferralLink from './FallbackReferralLink';

// Определяем, находимся ли мы в режиме разработки
const IS_DEV = process.env.NODE_ENV === 'development';

// Максимальное время отображения загрузки (убрали искусственную задержку)
const MAX_LOADING_TIME = 0;

// Максимальное время обновления данных
const AUTO_REFRESH_INTERVAL = 60 * 1000; // 1 минута

// Максимальное количество попыток получения ref_code
const MAX_RETRY_ATTEMPTS = 3;

const ReferralLinkCard: React.FC = () => {
  // Получаем доступ к queryClient для ручного обновления данных
  const queryClient = useQueryClient();
  
  // Состояние для отображения таймера загрузки и ошибок
  const [showLoading, setShowLoading] = useState(true);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const [forceShowLink, setForceShowLink] = useState(false); // Для принудительного отображения ссылки при наличии ref_code
  
  // Получаем информацию о текущем пользователе из API
  const { 
    data: currentUser, 
    isLoading: isUserLoading, 
    isError: isUserError,
    refetch,
  } = useQuery<User>({
    queryKey: ['/api/me'],
    queryFn: () => userService.getCurrentUser(true), // Всегда делаем свежий запрос
    staleTime: 1000 * 60 * 1, // Кэшируем данные на 1 минуту
    retry: 3, // Три попытки запроса
    refetchOnWindowFocus: true, // Обновлять данные при фокусе окна
  });
  
  // Функция для обновления данных пользователя и реферального кода
  const refreshUserData = useCallback(async () => {
    console.log('[ReferralLinkCard] Manual refresh of user data requested');
    setShowLoading(true);
    setLoadingTimedOut(false);
    setRetryAttempt(prev => prev + 1);
    setLastRefreshTime(Date.now());
    
    try {
      // Очищаем пользовательский кэш для получения свежих данных
      userService.clearUserCache();
      
      // Очищаем кэш запросов и делаем новый запрос
      await queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      const result = await refetch();
      
      console.log('[ReferralLinkCard] Manual refresh result:', {
        success: !!result.data,
        hasRefCode: !!result.data?.ref_code,
        refCode: result.data?.ref_code || 'missing'
      });
      
      // Если получили данные и там есть ref_code, убираем загрузку и включаем отображение ссылки
      if (result.data?.ref_code) {
        setShowLoading(false);
        setLoadingTimedOut(false);
        setForceShowLink(true); // Принудительно показываем ссылку
      } else if (retryAttempt >= MAX_RETRY_ATTEMPTS) {
        // Если превысили лимит попыток, показываем ошибку
        console.warn(`[ReferralLinkCard] Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) reached without getting ref_code`);
        setShowLoading(false);
        setLoadingTimedOut(true);
      }
    } catch (error) {
      console.error('[ReferralLinkCard] Error during manual refresh:', error);
      
      // Если ошибка после нескольких попыток, показываем сообщение
      if (retryAttempt >= MAX_RETRY_ATTEMPTS) {
        setShowLoading(false);
        setLoadingTimedOut(true);
      }
    }
  }, [queryClient, refetch, retryAttempt]);
  
  // Эффект для отслеживания состояния загрузки и таймаутов
  useEffect(() => {
    // АУДИТ: Расширенное логирование для диагностики
    console.log('[ReferralLinkCard] Loading state changed:', {
      isUserLoading,
      isUserError,
      hasUser: !!currentUser,
      hasRefCode: !!currentUser?.ref_code,
      refCode: currentUser?.ref_code || 'not defined',
      retryAttempt,
      timeElapsedSinceLastRefresh: Date.now() - lastRefreshTime,
      showLoading,
      loadingTimedOut,
      forceShowLink
    });
    
    // Этап 11.1: Удалена зависимость от telegram_id, больше не делаем запрос initData
    // Оставляем только логирование
    console.log('[ReferralLinkCard] Этап 11.1: Нет зависимости от telegram_id, используем только guest_id');
    
    // Сначала всегда показываем лоадер, но только на короткое время
    // Используем безопасное приведение типа для предотвращения LSP ошибки
    const safeUserForLoader = currentUser as User | undefined;
    if (isUserLoading && !safeUserForLoader?.ref_code) {
      setShowLoading(true);
    }
    
    // Логируем ref_code в режиме разработки и для диагностики
    if (currentUser) {
      console.log('[ReferralLinkCard] User data loaded:', {
        id: currentUser.id,
        telegram_id: currentUser.telegram_id,
        ref_code: currentUser.ref_code || 'missing'
      });
      
      if (!currentUser.ref_code) {
        console.warn('[Friends] АУДИТ: ref_code отсутствует в данных пользователя');
      } else {
        // Если у нас есть ref_code, ВСЕГДА включаем его отображение
        setForceShowLink(true);
      }
    }
    
    // Если загрузка данных завершена
    if (!isUserLoading) {
      // Если получен ref_code, убираем лоадер немедленно и ВСЕГДА показываем ссылку
      if (currentUser?.ref_code) {
        console.log('[ReferralLinkCard] Ref code found:', currentUser.ref_code);
        setShowLoading(false);
        setLoadingTimedOut(false);
        setForceShowLink(true); // Всегда показываем ссылку при наличии ref_code
      } else {
        // Если нет ref_code - проверяем, был ли это повторный запрос
        if (retryAttempt > 0) {
          console.log(`[ReferralLinkCard] Retry ${retryAttempt} did not return ref_code, showing error`);
          setShowLoading(false);
          setLoadingTimedOut(true);
        } else {
          // Если это первый запрос без ref_code - показываем сообщение об ошибке после 3-секундного таймера
          console.log('[ReferralLinkCard] No ref code found, setting timeout for error message');
          
          // Запускаем таймер для отображения ошибки
          const timer = setTimeout(() => {
            // Проверяем наличие ref_code еще раз перед установкой состояний
            if (currentUser?.ref_code) {
              setShowLoading(false);
              setLoadingTimedOut(false);
              setForceShowLink(true); // Принудительно показываем ссылку
            } else {
              setShowLoading(false);
              setLoadingTimedOut(true);
              
              // После таймаута сразу пробуем повторный запрос
              if (retryAttempt === 0) {
                console.log('[ReferralLinkCard] Auto-retry after timeout');
                refreshUserData();
              }
            }
          }, MAX_LOADING_TIME);
          
          return () => clearTimeout(timer);
        }
      }
    } else {
      // Ограничиваем время показа лоадера даже если загрузка продолжается
      const maxLoadingTimer = setTimeout(() => {
        // Если данные пользователя есть в любой форме
        if (currentUser) {
          // Безопасный доступ к свойству в объекте с проверкой типа
          const refCodeValue = typeof currentUser === 'object' && currentUser !== null && 'ref_code' in currentUser 
            ? (currentUser as any).ref_code || '' 
            : '';
          
          if (refCodeValue) {
            console.log('[ReferralLinkCard] Found ref_code after timeout:', refCodeValue);
            setShowLoading(false);
            setLoadingTimedOut(false);
            setForceShowLink(true); // Включаем отображение ссылки
          } else {
            console.warn('[ReferralLinkCard] User exists but ref_code is missing');
            setShowLoading(false);
            setLoadingTimedOut(true);
          }
        } else {
          console.warn('[ReferralLinkCard] Loading timed out without user data');
          setShowLoading(false);
          setLoadingTimedOut(true);
        }
      }, MAX_LOADING_TIME);
      
      return () => clearTimeout(maxLoadingTimer);
    }
    
    // Эффект для автоматического периодического обновления данных
    const autoRefreshTimer = setInterval(() => {
      // Проверяем, нужно ли обновить данные (если нет ref_code или прошло достаточно времени)
      const hasRefCode = !!currentUser?.ref_code;
      
      if (!hasRefCode && Date.now() - lastRefreshTime > AUTO_REFRESH_INTERVAL) {
        console.log('[ReferralLinkCard] Auto-refresh triggered');
        refreshUserData();
      }
    }, AUTO_REFRESH_INTERVAL);
    
    return () => clearInterval(autoRefreshTimer);
  }, [isUserLoading, currentUser, retryAttempt, lastRefreshTime, refreshUserData, isUserError]);
  
  // Формируем реферальную ссылку, используя ref_code
  let referralLink = '';
  
  // Получаем ref_code из данных пользователя
  // Важно: явно приводим currentUser к типу User | undefined, чтобы корректно обработать ref_code
  const safeUser = currentUser as User | undefined;
  const refCode = safeUser?.ref_code;
  
  // ОТЛАДКА: явно логируем получение ref_code
  console.log('[ReferralLinkCard] Received ref_code:', refCode || 'MISSING');
  
  // Проверяем наличие ref_code и формируем ссылку независимо от наличия Telegram WebApp
  // ВАЖНО: По требованию задачи, отображение ссылки зависит ТОЛЬКО от наличия ref_code
  // и НЕ должно зависеть от других условий (например, isTelegramAvailable)
  if (refCode) {
    // Используем корректный формат для Telegram Mini App по ТЗ
    // Формат строго такой: https://t.me/UniFarming_Bot/UniFarm?ref_code=КОД
    // Используется новый бот - UniFarming_Bot (с подчеркиванием) вместо старого UniFarmingBot
    referralLink = `https://t.me/UniFarming_Bot/UniFarm?ref_code=${refCode}`;
    // Добавляем отладочное логирование для отслеживания генерации ссылки
    console.debug('Referral rendered', { refCodeAvailable: !!refCode, refLink: referralLink });
    // Принудительно включаем отображение ссылки при наличии ref_code
    setForceShowLink(true);
  }
  
  // Состояния для анимаций и взаимодействий
  const [isCopied, setIsCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  
  // Эффект появления при загрузке
  const [opacity, setOpacity] = useState(0);
  const [translateY, setTranslateY] = useState(10);
  
  useEffect(() => {
    setOpacity(1);
    setTranslateY(0);
  }, []);
  
  // Копирование в буфер обмена
  const copyToClipboard = () => {
    if (!referralLink) return;
    
    try {
      // Пытаемся скопировать в буфер обмена (работает только с HTTPS)
      try {
        navigator.clipboard.writeText(referralLink);
      } catch (e) {
        // Fallback режим для платформ без поддержки clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = referralLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setIsCopied(true);
      
      // Через 2 секунды сбрасываем состояние
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Не удалось скопировать текст в буфер обмена', err);
    }
  };
  
  // Демонстрация анимации приглашения (визуальный эффект)
  const playInviteDemo = () => {
    if (isDemoPlaying) return;
    
    setIsDemoPlaying(true);
    
    // Через 3 секунды отключаем анимацию
    setTimeout(() => {
      setIsDemoPlaying(false);
    }, 3000);
  };
  
  return (
    <div 
      className="bg-card rounded-xl p-5 mb-5 shadow-lg card-hover-effect relative overflow-hidden"
      style={{
        opacity, 
        transform: `translateY(${translateY}px)`,
        transition: 'opacity 0.8s ease, transform 0.8s ease'
      }}
    >
      {/* Декоративные элементы фона */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-xl"></div>
      <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-accent/5 rounded-full blur-xl"></div>
      
      {/* Заголовок секции */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <i className="fas fa-share-alt text-primary mr-2"></i>
          Ваша партнёрская программа
        </h2>
        
        {/* Индикатор, активируемый при анимации демонстрации */}
        {isDemoPlaying && (
          <div className="flex items-center text-xs text-accent animate-pulse bg-accent/10 px-2 py-1 rounded-full">
            <i className="fas fa-user-plus mr-1"></i>
            <span>+1 новый друг</span>
          </div>
        )}
      </div>
      
      {/* Секция с реферальной ссылкой */}
      <div className="mb-6 bg-black/20 p-4 rounded-lg backdrop-blur-sm relative">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
          <h3 className="text-md font-medium text-white/90 flex items-center">
            <i className="fas fa-link text-primary/90 mr-2 text-sm"></i>
            Реферальная ссылка
          </h3>
          
          {/* Реферальный код - показываем, если он есть */}
          {!isUserLoading && refCode && (
            <div className="flex items-center text-sm text-muted-foreground mt-1 sm:mt-0">
              <span className="mr-2">Ваш код:</span>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">{refCode}</span>
            </div>
          )}
        </div>
        
        {/* Состояния загрузки и ошибок */}
        {(!refCode && (isUserLoading || showLoading)) && (
          <div className="flex justify-center items-center py-3">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
            <span className="text-sm text-muted-foreground">Получение ссылки...</span>
          </div>
        )}
        
        {/* Сообщение о проблеме загрузки, когда нет ссылки (оранжевое, не красное) */}
        {!isUserLoading && !refCode && loadingTimedOut && (
          <div className="flex flex-col justify-center items-center py-3 px-2 bg-amber-500/10 rounded-lg">
            <div className="flex items-center mb-2">
              <i className="fas fa-exclamation-circle text-amber-500/80 mr-2"></i>
              <span className="text-sm text-amber-500/80">Не удалось получить ссылку.</span>
            </div>
            <button
              onClick={refreshUserData}
              className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1 rounded-full transition-colors flex items-center mt-1"
            >
              <i className="fas fa-sync-alt mr-1 text-xs"></i>
              Обновить
            </button>
          </div>
        )}
        
        {/* Отображаем ссылку при любом наличии refCode, независимо от других условий */}
        {refCode && (
          <>
            <div className="flex relative">
              <div className="flex-grow relative">
                <input 
                  type="text" 
                  value={referralLink} 
                  readOnly
                  className={`
                    w-full bg-muted text-foreground rounded-l-lg px-3 py-2 text-sm
                    transition-all duration-300
                    ${isHovered ? 'bg-muted/80' : ''}
                  `}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                />
                
                {/* Эффект выделения при наведении */}
                {isHovered && (
                  <div className="absolute inset-0 border border-primary/30 rounded-l-lg pointer-events-none"></div>
                )}
              </div>
              
              <button 
                className={`
                  px-3 py-2 rounded-r-lg relative overflow-hidden
                  ${isCopied ? 'bg-accent' : 'bg-primary'}
                  transition-all duration-300
                `}
                onClick={copyToClipboard}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {/* Анимированный фон для кнопки */}
                <div 
                  className="absolute inset-0" 
                  style={{
                    background: isCopied 
                      ? 'linear-gradient(45deg, #00FF99, #00CC77)' 
                      : 'linear-gradient(45deg, #A259FF, #B368F7)',
                    opacity: isHovered ? 1 : 0.9,
                    transition: 'opacity 0.3s ease'
                  }}
                ></div>
                
                {/* Иконка в кнопке */}
                <i className={`
                  fas ${isCopied ? 'fa-check' : 'fa-copy'} 
                  relative z-10 text-white
                  ${isCopied ? 'scale-110' : ''}
                  transition-transform duration-300
                `}></i>
              </button>
              
              {/* Этап 11.1: Кнопка "Поделиться в Telegram" удалена для устранения зависимости от WebApp API */}
              
              {/* Тултип о статусе копирования */}
              {isCopied && (
                <div className="absolute -top-8 right-0 bg-accent/90 text-white text-xs px-2 py-1 rounded shadow-md animate-fadeIn">
                  Ссылка скопирована
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Секция с кнопками проверки связи */}
      <div className="mt-6 mb-3">
        <h3 className="text-md font-medium text-white/80 mb-3 flex items-center">
          <i className="fas fa-signal text-blue-400 mr-2 text-sm"></i>
          Проверка соединения
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <button 
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-300 shadow-md hover:shadow-lg flex items-center justify-center"
          >
            <i className="fas fa-wifi mr-2"></i>
            Проверка связи 1
          </button>
          
          <button 
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-2 px-4 rounded-lg transition-colors duration-300 shadow-md hover:shadow-lg flex items-center justify-center"
          >
            <i className="fas fa-broadcast-tower mr-2"></i>
            Проверка связи 2
          </button>
        </div>
      </div>
      
      {/* Подсказка о принципе работы - обновленный текст */}
      <div className="text-xs text-foreground opacity-70 mt-4 bg-primary/5 p-3 rounded-lg">
        <p className="font-medium mb-1 text-center text-primary/90">
          Приглашайте друзей и зарабатывайте до 100% от их дохода в UNI и TON!
        </p>
        <p className="mb-1">
          С первого уровня — вы получаете 100% от фарминга приглашённого.
        </p>
        <p className="mb-1">
          Стройте глубокую сеть до 20 уровней и получайте стабильный доход с каждого уровня.
        </p>
        <p>
          Пассивный доход растёт вместе с вашей командой!
        </p>
      </div>
    </div>
  );
};

export default ReferralLinkCard;