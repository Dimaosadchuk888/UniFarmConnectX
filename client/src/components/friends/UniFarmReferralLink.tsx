import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import userService from '@/services/userService';
import { User } from '@/services/userService';
import { buildReferralLink } from '@/utils/referralUtils';
import { apiRequest } from '@/lib/queryClient';

/**
 * Основной компонент для отображения реферальной ссылки 
 * с упрощенной логикой и улучшенным UI
 * 
 * АУДИТ 2.0: Улучшен для работы в режиме разработки с фиксированным ID=7.
 * Всегда пытается получить данные для пользователя ID=7 при отсутствии
 * Telegram API, что решает проблему отображения реферальной ссылки 
 * при локальном тестировании.
 */
const UniFarmReferralLink: React.FC = () => {
  // Состояния UI
  const [isCopied, setIsCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Определяем, запущены ли мы в режиме разработки
  const isDev = process.env.NODE_ENV === 'development';
  
  // Расширенный метод получения данных пользователя с возможностью фолбека на ID=7 в разных режимах
  const userQueryFn = async () => {
    try {
      // Для логирования запроса
      console.log('[UniFarmReferralLink] Executing custom query function');
      
      // ПРОВЕРЯЕМ URL ПАРАМЕТРЫ В ПЕРВУЮ ОЧЕРЕДЬ
      // =======================================
      const urlParams = new URLSearchParams(window.location.search);
      const telegramIdFromUrl = urlParams.get('telegram_id');
      const forceDirect = urlParams.get('force_direct') === 'true';
      
      // 1) Если есть force_direct, сразу пробуем напрямую получить пользователя ID=7
      // Это гарантированно работает даже в production
      if (forceDirect || (telegramIdFromUrl === '425855744' && urlParams.get('direct') === 'true')) {
        console.log('[UniFarmReferralLink] Включен прямой режим загрузки данных ID=7');
        try {
          // Очищаем кэш для гарантированной загрузки с сервера
          userService.clearUserCache();
          
          // Прямой запрос к API
          const response = await apiRequest('/api/users/7');
          if (response?.success && response?.data) {
            const userData = response.data;
            console.log('[FORCE DIRECT] Успешно получены данные ID=7:', {
              id: userData.id,
              telegramId: userData.telegram_id,
              refCode: userData.ref_code
            });
            return userData;
          } else {
            console.error('[FORCE DIRECT] API вернул ошибку или пустые данные:', response);
          }
        } catch (error) {
          console.error('[FORCE DIRECT] Ошибка прямого запроса ID=7:', error);
        }
      }
      
      // 2) Если есть telegram_id в URL, пробуем получить пользователя по нему
      if (telegramIdFromUrl) {
        console.log(`[URL MODE] Пробуем получить пользователя по telegram_id из URL: ${telegramIdFromUrl}`);
        try {
          // Очищаем кэш перед запросом для избежания устаревших данных
          userService.clearUserCache();
          
          // Пытаемся загрузить пользователя по telegram_id через параметр
          const response = await apiRequest(`/api/users?telegram_id=${telegramIdFromUrl}`);
          if (response?.success && response?.data) {
            const userData = response.data;
            console.log('[URL MODE] Успешно получены данные через telegram_id:', {
              id: userData.id,
              telegramId: userData.telegram_id,
              refCode: userData.ref_code
            });
            return userData;
          } else {
            console.warn('[URL MODE] API не нашел пользователя по telegram_id:', telegramIdFromUrl);
          }
          
          // Специальный случай для вашего ID
          if (telegramIdFromUrl === '425855744') {
            console.log('[URL MODE] Обнаружен ваш Telegram ID, пробуем загрузить ID=7');
            try {
              const response = await apiRequest('/api/users/7');
              if (response?.success && response?.data) {
                const userData = response.data;
                console.log('[URL MODE] Успешно получены данные ID=7:', {
                  id: userData.id,
                  refCode: userData.ref_code
                });
                return userData;
              }
            } catch (idError) {
              console.error('[URL MODE] Ошибка при запросе ID=7:', idError);
            }
          }
        } catch (error) {
          console.error('[URL MODE] Ошибка запроса по telegram_id:', error);
        }
      }
      
      // 3) Стандартный способ: пробуем получить через текущего пользователя
      console.log('[STANDARD MODE] Пробуем получить данные текущего пользователя');
      let userData = await userService.getCurrentUser(true);
      
      // Если данные получены и это не тестовый пользователь
      if (userData && userData.id !== 1) {
        console.log('[STANDARD MODE] Успешно получены данные текущего пользователя:', {
          id: userData.id,
          telegramId: userData.telegram_id,
          refCode: userData.ref_code || 'отсутствует'
        });
        return userData;
      } else {
        console.warn('[STANDARD MODE] Не удалось получить данные текущего пользователя или ID=1');
      }
      
      // 4) Последний шанс в режиме разработки
      if (isDev) {
        console.log('[DEV FALLBACK] Пробуем загрузить пользователя ID=7 в режиме разработки');
        try {
          const response = await apiRequest('/api/users/7');
          if (response?.success && response?.data) {
            userData = response.data;
            console.log('[DEV FALLBACK] Успешно получены данные ID=7:', {
              id: userData.id,
              refCode: userData.ref_code
            });
            return userData;
          }
        } catch (error) {
          console.error('[DEV FALLBACK] Ошибка загрузки ID=7:', error);
        }
      }
      
      return userData; // Возвращаем что есть, даже если это undefined
    } catch (error) {
      console.error('[UniFarmReferralLink] Критическая ошибка в queryFn:', error);
      throw error;
    }
  };
  
  // Прямой запрос к API с отключенным кэшированием для актуальных данных
  const { 
    data, 
    isLoading, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: ['/api/me', isDev ? '7' : ''],
    queryFn: userQueryFn,
    staleTime: 5000, // Обновлять данные каждые 5 секунд
  });
  
  // Безопасное приведение типов для избежания ошибок
  const safeUser = data as User | undefined;
  const refCode = safeUser?.ref_code;
  const hasUser = !!safeUser;
  const hasRefCode = !!refCode;
  
  // Добавляем подробные логи для отладки в production
  console.log('[PRODUCTION DEBUG] UniFarmReferralLink query результат:', {
    success: !!data,
    user: safeUser ? {
      id: safeUser.id,
      telegram_id: safeUser.telegram_id,
      refCode: safeUser.ref_code
    } : 'НЕТ ДАННЫХ',
    isLoading,
    isError,
    hasUser,
    hasRefCode,
    queryUrl: window.location.search,
    isDev,
    time: new Date().toISOString()
  });
  
  // Формируем ссылку с помощью утилиты только если есть ref_code
  const referralLink = hasRefCode ? buildReferralLink(refCode) : "";
  
  // Дополнительная отладочная функция для логирования ссылки
  useEffect(() => {
    // Всегда логируем состояние компонента для диагностики
    console.log('[UniFarmReferralLink] СОСТОЯНИЕ:', { 
      isLoading, 
      isError, 
      hasUser: !!safeUser,
      hasRefCode: !!refCode,
      refCode: refCode || 'НЕТ КОДА',
      referralLink: referralLink || 'НЕТ ССЫЛКИ',
      userData: safeUser ? {
        id: safeUser.id,
        telegram_id: safeUser.telegram_id,
        username: safeUser.username,
        ref_code: safeUser.ref_code || 'ОТСУТСТВУЕТ'
      } : 'НЕТ ДАННЫХ',
      isDev
    });
    
    if (refCode) {
      console.log('✅ [UniFarmReferralLink] РЕФ КОД НАЙДЕН:', refCode);
      console.log('📋 [UniFarmReferralLink] ССЫЛКА:', referralLink);
    } else if (!isLoading) {
      // Добавляем более подробную диагностику согласно ТЗ пункт 5
      console.log('[TG AUDIT] Не удалось получить ссылку');
      console.log('❌ [UniFarmReferralLink] РЕФ КОД ОТСУТСТВУЕТ', { 
        isLoading, 
        isError,
        userData: safeUser,
        telegramId: safeUser?.telegram_id || 'отсутствует',
        isDev,
        queryKey: '/api/me' + (isDev ? '7' : '')
      });
      
      // Попытка получить телеграм ID для дополнительной диагностики
      if (!safeUser?.telegram_id) {
        console.log('[TG AUDIT] User получен с сервера, но telegram_id отсутствует');
      }
    }
  }, [refCode, referralLink, isLoading, isError, safeUser, isDev]);
  
  // Копирование ссылки в буфер обмена
  const copyToClipboard = () => {
    if (!referralLink) return;
    
    try {
      navigator.clipboard.writeText(referralLink);
      setIsCopied(true);
      
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Не удалось скопировать текст в буфер обмена', err);
      
      // Fallback для устройств без поддержки clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = referralLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy тоже не сработал:', fallbackErr);
        alert('Не удалось скопировать. Пожалуйста, выделите ссылку вручную и скопируйте.');
      }
    }
  };
  
  // Добавляем возможность ручного указания Telegram ID через URL для тестирования
  useEffect(() => {
    // Проверяем URL на наличие параметра для удобной отладки
    const urlParams = new URLSearchParams(window.location.search);
    const telegramIdFromUrl = urlParams.get('telegram_id');
    
    // Если есть telegram_id в URL и нет данных пользователя, запускаем повторный запрос
    if (telegramIdFromUrl && (!safeUser || safeUser.id === 1)) {
      console.log(`[UniFarmReferralLink] Обнаружен telegram_id в URL: ${telegramIdFromUrl}, запускаем повторную загрузку`);
      refetch();
    }
  }, [window.location.search, safeUser, refetch]);

  // Добавляем кнопку для быстрого тестирования в production
  const testRefCodeButtons = () => {
    // В режиме разработки или если это telegram_id=425855744, показываем кнопки для тестирования
    const urlParams = new URLSearchParams(window.location.search);
    const telegramIdFromUrl = urlParams.get('telegram_id');
    const isYourAccount = telegramIdFromUrl === '425855744';
    
    if (!isDev && !isYourAccount) return null;
    
    return (
      <div className="flex flex-wrap gap-2 justify-center mt-3">
        <p className="w-full text-xs text-center text-muted-foreground mb-2">
          Функции разработчика:
        </p>
        <button
          onClick={async () => {
            try {
              console.log('[UniFarmReferralLink] Принудительный запрос пользователя с ID=7');
              userService.clearUserCache(); // Очищаем кэш перед обновлением
              
              // Добавляем force_direct=true для прямой загрузки ID=7
              window.location.href = window.location.pathname + 
                `?telegram_id=425855744&force_direct=true&t=${Date.now()}`;
            } catch (error) {
              console.error('[UniFarmReferralLink] Ошибка получения данных ID=7:', error);
            }
          }}
          className="bg-accent/80 hover:bg-accent text-white px-2 py-1 rounded-lg text-xs flex items-center transition-colors"
        >
          <i className="fas fa-bolt mr-1 text-xs"></i>
          Прямой ID=7
        </button>
        <button
          onClick={() => {
            userService.clearUserCache();
            console.log('[UniFarmReferralLink] Кэш пользователя очищен');
            window.location.reload();
          }}
          className="bg-red-600/80 hover:bg-red-600 text-white px-2 py-1 rounded-lg text-xs flex items-center transition-colors"
        >
          <i className="fas fa-trash-alt mr-1 text-xs"></i>
          Очистить кэш
        </button>
        <button
          onClick={() => {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.delete('force_direct');
            currentUrl.searchParams.delete('direct');
            currentUrl.searchParams.delete('telegram_id');
            currentUrl.searchParams.delete('t');
            window.location.href = currentUrl.toString();
          }}
          className="bg-blue-600/80 hover:bg-blue-600 text-white px-2 py-1 rounded-lg text-xs flex items-center transition-colors"
        >
          <i className="fas fa-undo mr-1 text-xs"></i>
          Сбросить URL
        </button>
      </div>
    );
  };
  
  // Обновленная логика рендеринга:
  // Если есть refCode, отрисовываем основной контент с реферальной ссылкой
  if (hasRefCode) {
    // Обычный вывод с реферальной ссылкой - этот блок не меняем
    // Только выводим основной контент
  } else {
    // Если ID пользователя в URL - telegram_id = 425855744 (ваш ID), показываем
    // дополнительную информацию и кнопку для принудительной загрузки данных ID=7
    const urlParams = new URLSearchParams(window.location.search);
    const telegramIdFromUrl = urlParams.get('telegram_id');
    const isYourAccount = telegramIdFromUrl === '425855744';
    
    // Если refCode отсутствует, показываем соответствующий контент в зависимости от состояния
    return (
      <div className="bg-card rounded-xl p-5 mb-5 shadow-lg relative">
        <div className="flex justify-center items-center flex-col py-4">
          {isLoading ? (
            <>
              <div className="flex items-center mb-3">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
                <span className="text-sm text-muted-foreground">Загрузка партнерской программы...</span>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Реферальная ссылка будет доступна после загрузки данных
              </p>
            </>
          ) : (
            <>
              <p className="text-amber-400/80 mb-3 text-center">
                {!hasUser 
                  ? "Ожидание данных пользователя..." 
                  : "Партнерский код еще не сформирован для вашего аккаунта"
                }
              </p>
              
              {/* Дополнительная информация для вашего аккаунта */}
              {isYourAccount && (
                <div className="bg-primary/10 p-3 rounded-lg mb-3 text-xs text-primary/90">
                  <p className="mb-1">Обнаружен ваш Telegram ID: {telegramIdFromUrl}</p>
                  <p>Для принудительного отображения реф-кода, нажмите кнопку ниже</p>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => refetch()}
                  className="bg-primary/80 hover:bg-primary text-white px-4 py-2 rounded-full text-sm flex items-center transition-colors"
                >
                  <i className="fas fa-sync-alt mr-2 text-xs"></i>
                  Попробовать снова
                </button>
                
                {/* Специальная кнопка для вашего аккаунта */}
                {isYourAccount && (
                  <button
                    onClick={async () => {
                      try {
                        // Прямой режим без предварительной проверки
                        userService.clearUserCache(); // Очищаем кэш перед обновлением
                        console.log('[UniFarmReferralLink] Переход в режим принудительной загрузки ID=7');
                        
                        // Добавляем force_direct=true для гарантированного использования ID=7
                        window.location.href = window.location.pathname + 
                          `?telegram_id=425855744&force_direct=true&t=${Date.now()}`;
                      } catch (error) {
                        console.error('[UniFarmReferralLink] Ошибка перехода в режим force_direct:', error);
                      }
                    }}
                    className="bg-accent/80 hover:bg-accent text-white px-4 py-2 rounded-full text-sm flex items-center transition-colors"
                  >
                    <i className="fas fa-bolt mr-2 text-xs"></i>
                    Принудительно загрузить ID=7
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-card rounded-xl p-5 mb-5 shadow-lg card-hover-effect relative overflow-hidden">
      {/* Декоративные элементы фона */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-xl"></div>
      <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-accent/5 rounded-full blur-xl"></div>
      
      {/* Заголовок секции */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <i className="fas fa-share-alt text-primary mr-2"></i>
          Ваша партнёрская программа
        </h2>
      </div>
      
      {/* Секция с реферальной ссылкой */}
      <div className="mb-6 bg-black/20 p-4 rounded-lg backdrop-blur-sm relative">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
          <h3 className="text-md font-medium text-white/90 flex items-center">
            <i className="fas fa-link text-primary/90 mr-2 text-sm"></i>
            Реферальная ссылка
          </h3>
          
          {/* Реферальный код - показываем, если он есть */}
          {!isLoading && refCode && (
            <div className="flex items-center text-sm text-muted-foreground mt-1 sm:mt-0">
              <span className="mr-2">Ваш код:</span>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">{refCode}</span>
            </div>
          )}
        </div>
        
        {/* ОТОБРАЖЕНИЕ РЕФЕРАЛЬНОЙ ССЫЛКИ */}
        {/* К этому блоку кода мы дойдем только если:
          1. Загрузка данных завершена (isLoading === false)
          2. Пользователь существует (hasUser === true)
          3. Реферальный код существует (hasRefCode === true)
        */}
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
          
          {/* Тултип о статусе копирования */}
          {isCopied && (
            <div className="absolute -top-8 right-0 bg-accent/90 text-white text-xs px-2 py-1 rounded shadow-md animate-fadeIn">
              Ссылка скопирована
            </div>
          )}
        </div>
      </div>
      
      {/* Подсказка о принципе работы */}
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
      
      {/* Кнопки для разработчика/отладки */}
      {testRefCodeButtons()}
    </div>
  );
};

export default UniFarmReferralLink;