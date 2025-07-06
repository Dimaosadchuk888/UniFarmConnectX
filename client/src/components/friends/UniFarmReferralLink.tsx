import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@/services/userService';
import userService from '@/services/userService';
import { createReferralLink, generateReferralCode } from '@/utils/referralUtils';
import { apiRequest } from '@/lib/queryClient';
import { correctApiRequest } from '@/lib/correctApiRequest';
import { useToast } from '@/hooks/use-toast';

/**
 * Компонент для отображения реферальной ссылки
 * Версия 7.0: Принимает данные пользователя от родительского компонента
 * и имеет локальный запрос данных как резервный вариант
 */
interface UniFarmReferralLinkProps {
  userData?: User;  // Данные пользователя от родителя
  parentIsLoading?: boolean;  // Состояние загрузки родителя
  parentIsError?: boolean;    // Состояние ошибки родителя
}

const UniFarmReferralLink: React.FC<UniFarmReferralLinkProps> = ({ 
  userData, 
  parentIsLoading = false,
  parentIsError = false
}) => {
  // Состояния UI (все useState должны быть вызваны в одном и том же порядке)
  const [isCopied, setIsCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [linkType, setLinkType] = useState<'app' | 'bot'>('app');
  const [isRetrying, setIsRetrying] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  
  // Доступ к React Query Client для управления кэшем
  const queryClient = useQueryClient();
  
  // Hook для toast уведомлений
  const { toast } = useToast();
  
  // Запрос данных пользователя через централизованный userService (резервный вариант)
  const { 
    data: queryData, 
    isLoading: queryIsLoading, 
    isError: queryIsError, 
    refetch 
  } = useQuery({
    queryKey: ['/api/v2/users/profile'],
    queryFn: async () => {
      console.log('[UniFarmReferralLink] Резервный запрос данных пользователя');
      try {
        // Принудительно обновляем данные (true) для убедительного получения свежих данных
        const result = await userService.getCurrentUser(true);
        console.log('[UniFarmReferralLink] Результат запроса данных:', {
          success: !!result,
          hasRefCode: !!result?.ref_code,
          refCode: result?.ref_code,
          telegramId: result?.telegram_id,
          guestId: result?.guest_id
        });
        
        // Проверка корректности данных пользователя
        if (!result) {
          throw new Error('Пустые данные пользователя');
        }
        
        // Дополнительная проверка и коррекция типов данных
        const safeResult = {
          ...result,
          id: Number(result.id),
          telegram_id: result.telegram_id !== undefined ? 
            (result.telegram_id === null ? null : Number(result.telegram_id)) : null,
          balance_uni: String(result.balance_uni || "0"),
          balance_ton: String(result.balance_ton || "0"),
          ref_code: String(result.ref_code || "")
        };
        
        return safeResult;
      } catch (error) {
        console.error('[UniFarmReferralLink] Ошибка при запросе данных пользователя:', error);
        throw error;
      }
    },
    retry: 3, // Увеличиваем количество повторных попыток
    retryDelay: 1000,
    staleTime: 0, // Отключаем кэширование для этого компонента
    refetchOnWindowFocus: true, // Включаем обновление при фокусе окна
    // Всегда запрашиваем данные, даже если есть данные от родителя
    enabled: true
  });
  
  // Используем данные от родителя или из запроса
  const data = userData || queryData;
  
  // Объединяем состояния загрузки и ошибки
  const isInitialLoading = !data && (parentIsLoading || queryIsLoading);
  const isLoading = parentIsLoading || (queryIsLoading && !userData);
  const isError = parentIsError || (queryIsError && !userData);
  
  // Извлекаем реферальный код из данных пользователя
  const refCode = data?.ref_code;
  
  // Детальная диагностика состояния реферального кода
  useEffect(() => {
    // Проверяем состояние Telegram WebApp
    const telegramState = {
      isInTelegram: typeof window !== 'undefined' && !!window.Telegram?.WebApp,
      hasInitData: typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData,
      initDataLength: typeof window !== 'undefined' ? (window.Telegram?.WebApp?.initData?.length || 0) : 0,
      hasUser: typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initDataUnsafe?.user,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'SSR'
    };
    
    console.log('[UniFarmReferralLink] Состояние компонента:', { 
      isComponentMounted: true,
      hasData: !!data, 
      userData: data ? {
        id: data.id,
        guest_id: data.guest_id,
        refCode: data.ref_code || 'Отсутствует',
        hasRefCode: !!data.ref_code,
        parentRefCode: data.parent_ref_code || 'Отсутствует'
      } : 'Данные отсутствуют',
      linkType,
      referralLink: refCode ? createReferralLink(refCode) : 'Не удалось создать (нет ref_code)',
      directBotLink: refCode ? createReferralLink(refCode) : 'Не удалось создать (нет ref_code)',
      telegramState
    });
  }, [data, refCode, linkType]);
  
  // Формируем ссылки с помощью утилит
  const referralLink = refCode ? createReferralLink(refCode) : "";
  const directBotLink = refCode ? createReferralLink(refCode) : "";
  
  // Слушатель событий обновления пользователя
  useEffect(() => {
    const handleUserUpdate = (event: CustomEvent) => {
      const updatedUser = event.detail;
      if (updatedUser && updatedUser.ref_code) {
        console.log('[UniFarmReferralLink] Получено событие обновления пользователя:', { 
          id: updatedUser.id,
          hasRefCode: !!updatedUser.ref_code
        });
        
        // Обновляем кэш React Query с новыми данными пользователя
        queryClient.setQueryData(['/api/v2/users/profile'], updatedUser);
      }
    };
    
    // Добавляем слушатель пользовательских событий
    window.addEventListener('user:updated', handleUserUpdate as EventListener);
    
    // Удаляем слушатель при размонтировании компонента
    return () => {
      window.removeEventListener('user:updated', handleUserUpdate as EventListener);
    };
  }, [queryClient]);
  
  // Функция генерации реферального кода (если он отсутствует)
  const generateRefCode = useCallback(async () => {
    if (isGeneratingCode || !data) return;
    
    // Проверяем наличие ID или guest_id
    if (!data.id && !data.guest_id) {
      console.error('[UniFarmReferralLink] Нет идентификаторов для генерации реферального кода');
      return;
    }
    
    setIsGeneratingCode(true);
    try {
      console.log('[UniFarmReferralLink] Запрос на генерацию реферального кода через userService');
      
      // Используем централизованный метод из userService
      // Этот метод сам обновит кэш и сгенерирует событие user:updated
      const newRefCode = await userService.generateRefCode();
      
      console.log('[UniFarmReferralLink] Реферальный код успешно сгенерирован:', newRefCode);
      
      // Дополнительно инвалидируем кэш React Query для гарантированного обновления UI
      queryClient.invalidateQueries({ queryKey: ['/api/v2/users/profile'] });
      
      return newRefCode;
    } catch (error) {
      console.error('[UniFarmReferralLink] Ошибка при генерации реферального кода:', error);
      throw error;
    } finally {
      setIsGeneratingCode(false);
    }
  }, [data, isGeneratingCode, queryClient]);
  
  // Принудительная загрузка данных после монтирования компонента
  useEffect(() => {
    // Запускаем загрузку данных сразу после монтирования компонента
    console.log('[UniFarmReferralLink] Компонент смонтирован, проверяем необходимость загрузки данных');
    
    // Если данных нет, но загрузка ещё не началась - запускаем её
    if (!data && !isLoading && !isError) {
      console.log('[UniFarmReferralLink] Принудительная загрузка начальных данных');
      refetch().catch(error => 
        console.error('[UniFarmReferralLink] Ошибка при начальной загрузке данных:', error)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isLoading, isError, refetch]); // Указываем все используемые в эффекте зависимости
  
  // Проверяем наличие ref_code и пытаемся получить его при необходимости
  useEffect(() => {
    console.log('[UniFarmReferralLink] Проверяем наличие реферального кода:', { 
      hasData: !!data, 
      hasRefCode: data?.ref_code ? true : false,
      isLoading,
      isGeneratingCode
    });
    
    // Проверяем доступность Telegram данных
    const telegramAvailable = typeof window !== 'undefined' && window.Telegram?.WebApp;
    console.log('[UniFarmReferralLink] Telegram доступность:', {
      available: telegramAvailable,
      hasInitData: telegramAvailable ? !!window.Telegram?.WebApp?.initData : false,
      hasUser: telegramAvailable ? !!window.Telegram?.WebApp?.initDataUnsafe?.user : false
    });
    
    // Всегда запрашиваем обновленные данные при монтировании компонента
    refetch()
      .then((result) => {
        console.log('[UniFarmReferralLink] Обновлены данные:', { 
          hasData: !!result.data,
          hasRefCode: result.data?.ref_code ? true : false,
          isError: result.isError,
          error: result.error
        });
        
        // Если данные получены, но ref_code отсутствует
        if (result.isSuccess && result.data && !result.data.ref_code) {
          console.log('[UniFarmReferralLink] После обновления ref_code всё ещё отсутствует, генерируем новый');
          
          // Ставим небольшую паузу для стабильной работы
          setTimeout(() => {
            generateRefCode()
              .then(code => {
                console.log('[UniFarmReferralLink] Успешно сгенерирован новый код:', code);
                // Принудительно запрашиваем обновление данных после генерации кода
                refetch();
              })
              .catch(genError => console.error('[UniFarmReferralLink] Ошибка генерации кода:', genError));
          }, 500);
        }
      })
      .catch(error => {
        console.error('[UniFarmReferralLink] Ошибка при обновлении данных:', error);
        // Проверяем, связана ли ошибка с Telegram
        if (error?.message?.includes('wrapServiceFunction')) {
          console.error('[UniFarmReferralLink] Обнаружена проблема с Telegram сервисом');
        }
      });
  }, []);
  
  // Копирование ссылки в буфер обмена
  const copyToClipboard = useCallback((type: 'app' | 'bot' = linkType) => {
    const linkToCopy = type === 'app' ? referralLink : directBotLink;
    if (!linkToCopy) return;
    
    try {
      navigator.clipboard.writeText(linkToCopy);
      setIsCopied(true);
      
      // Показываем toast уведомление
      toast({
        title: "Ссылка скопирована",
        description: "Реферальная ссылка скопирована в буфер обмена",
      });
      
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      // Отключаем небезопасный fallback для устранения DOM ошибок
      setIsCopied(true);
      toast({
        title: "Ошибка копирования",
        description: "Не удалось скопировать ссылку",
        variant: "destructive"
      });
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
      console.log('Копирование недоступно, используйте долгое нажатие на ссылку');
    }
  }, [linkType, referralLink, directBotLink, toast]);
  
  // Функция для отправки в Telegram
  const shareViaTelegram = useCallback((type: 'app' | 'bot' = linkType) => {
    const linkToShare = type === 'app' ? referralLink : directBotLink;
    if (!linkToShare) return;
    
    // Фиксированный текст сообщения согласно ТЗ
    const messageText = `Привет 🙋‍♂️
Я только что забрал 500 монет в UNI — просто за вход в Telegram-приложение.
Без подвязок и лишних условий: зашёл в бота — и они у тебя на балансе 🪙

⚠️ Пока дают — лучше не тянуть.
👉 ${linkToShare}`;
    
    // Кодируем текст для URL
    const encodedText = encodeURIComponent(messageText);
    
    // Формируем Telegram URL
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(linkToShare)}&text=${encodedText}`;
    
    // Открываем Telegram
    window.open(telegramUrl, '_blank');
  }, [linkType, referralLink, directBotLink]);
  
  // Функция для повторной попытки получения данных
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      const result = await refetch();
      
      // Если данные получены, но ref_code отсутствует, пробуем его сгенерировать
      if (result.isSuccess && result.data && !result.data.ref_code) {
        console.log('[UniFarmReferralLink] После повторного запроса ref_code отсутствует, генерируем');
        await generateRefCode();
      }
    } catch (error) {
      console.error('[UniFarmReferralLink] Ошибка при повторном запросе:', error);
    } finally {
      setIsRetrying(false);
    }
  }, [refetch, generateRefCode]);
  
  // Загрузка данных - стандартный случай
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-5 mb-5 shadow-lg relative">
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
          <span className="text-sm text-muted-foreground">Загрузка партнерской программы...</span>
        </div>
      </div>
    );
  }

  // Начальная загрузка - особое состояние, когда данных ещё нет, но загрузка идёт
  if (isInitialLoading) {
    return (
      <div className="bg-card rounded-xl p-5 mb-5 shadow-lg relative">
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
          <span className="text-sm text-muted-foreground">Инициализация партнерской программы...</span>
        </div>
      </div>
    );
  }

  // Если генерируется новый код
  if (isGeneratingCode) {
    return (
      <div className="bg-card rounded-xl p-5 mb-5 shadow-lg relative">
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
          <span className="text-sm text-muted-foreground">Создание вашей реферальной ссылки...</span>
        </div>
      </div>
    );
  }

  // Если произошла ошибка или данные отсутствуют (только если не в процессе загрузки)
  if ((isError || !data) && !isLoading) {
    return (
      <div className="bg-card rounded-xl p-5 mb-5 shadow-lg relative">
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="text-amber-500 mb-2">
            <i className="fas fa-exclamation-triangle text-xl"></i>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Не удалось загрузить данные для реферальной ссылки
          </p>
          
          <div className="flex space-x-2">
            {/* Кнопка для локального обновления данных без перезагрузки страницы */}
            <button 
              onClick={handleRetry}
              disabled={isRetrying}
              className={`
                px-4 py-1.5 rounded-md text-white text-xs
                ${isRetrying ? 'bg-primary/60 cursor-not-allowed' : 'bg-primary hover:bg-primary/90'}
                transition-colors
              `}
            >
              {isRetrying ? (
                <div className="flex items-center">
                  <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full mr-1.5"></div>
                  <span>Загрузка...</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <i className="fas fa-sync-alt mr-1.5"></i>
                  <span>Обновить данные</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Если данные получены, но ref_code отсутствует - отображаем состояние создания ссылки
  if (!refCode) {
    return (
      <div className="bg-card rounded-xl p-5 mb-5 shadow-lg relative">
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="text-primary mb-2">
            <i className="fas fa-link text-xl"></i>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Необходимо создать вашу реферальную ссылку
          </p>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => generateRefCode()}
              disabled={isGeneratingCode}
              className={`
                px-4 py-1.5 rounded-md text-white text-xs
                ${isGeneratingCode ? 'bg-primary/60 cursor-not-allowed' : 'bg-primary hover:bg-primary/90'}
                transition-colors
              `}
            >
              {isGeneratingCode ? (
                <div className="flex items-center">
                  <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full mr-1.5"></div>
                  <span>Создание ссылки...</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <i className="fas fa-magic mr-1.5"></i>
                  <span>Создать реферальную ссылку</span>
                </div>
              )}
            </button>
            
            <button
              onClick={() => refetch()}
              disabled={isRetrying}
              className="px-4 py-1.5 rounded-md text-xs text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center">
                <i className="fas fa-sync-alt mr-1.5"></i>
                <span>Обновить данные</span>
              </div>
            </button>
            
            <p className="text-xs text-gray-400 mt-2">
              Если ссылка не появляется, попробуйте обновить страницу или проверьте соединение с интернетом.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Основной UI с реферальной ссылкой
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
          
          {/* Реферальный код полностью скрыт по запросу */}
        </div>
        
        {/* Переключатель типа ссылки */}
        <div className="flex justify-center mb-3">
          <div className="bg-black/30 rounded-full p-1 flex text-xs">
            <button
              className={`px-3 py-1.5 rounded-full transition-all ${
                linkType === 'app' 
                  ? 'bg-primary text-white' 
                  : 'text-white/70 hover:text-white'
              }`}
              onClick={() => setLinkType('app')}
            >
              <i className="fas fa-mobile-alt mr-1"></i>
              Mini App
            </button>
            <button
              className={`px-3 py-1.5 rounded-full transition-all ${
                linkType === 'bot' 
                  ? 'bg-primary text-white' 
                  : 'text-white/70 hover:text-white'
              }`}
              onClick={() => setLinkType('bot')}
            >
              <i className="fas fa-robot mr-1"></i>
              Telegram Bot
            </button>
          </div>
        </div>

        {/* Отображение выбранной ссылки */}
        <div className="flex relative">
          <div className="flex-grow relative">
            <input 
              type="text" 
              value={linkType === 'app' ? referralLink : directBotLink} 
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
          
          {/* Кнопка копирования */}
          <button 
            className={`
              px-3 py-2 relative overflow-hidden
              ${isCopied ? 'bg-accent' : 'bg-primary'}
              transition-all duration-300
              flex items-center justify-center
            `}
            onClick={() => copyToClipboard(linkType)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            title="Копировать ссылку"
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
            
            {/* Иконка копирования */}
            <i className={`
              fas ${isCopied ? 'fa-check' : 'fa-clipboard'} 
              relative z-10 text-white
              ${isCopied ? 'scale-110' : ''}
              transition-transform duration-300
            `}></i>
          </button>
          
          {/* Кнопка "Поделиться через Telegram" */}
          <button 
            className={`
              px-3 py-2 rounded-r-lg relative overflow-hidden
              bg-[#2AABEE] hover:bg-[#229ED9]
              transition-all duration-300
              flex items-center justify-center ml-1
            `}
            onClick={() => shareViaTelegram(linkType)}
            title="Поделиться через Telegram"
          >
            {/* Иконка Telegram */}
            <svg 
              className="w-5 h-5 text-white relative z-10"
              viewBox="0 0 24 24" 
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.015-.15-.056-.212s-.174-.041-.248-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.429-.009-1.253-.242-1.865-.442-.752-.244-1.349-.374-1.297-.789.027-.216.324-.437.893-.661 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.322.023.465.141.121.099.154.232.17.337.015.105.034.236.019.365z"/>
            </svg>
          </button>
        </div>

        {/* Подсказка о типе ссылки */}
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {linkType === 'app' 
            ? "Ссылка для запуска Mini App в Telegram" 
            : "Ссылка для перехода к диалогу с ботом"
          }
        </p>
      </div>
      
      {/* Подсказка о принципе работы - улучшена читаемость для мобильных устройств */}
      <div className="text-sm md:text-base text-foreground mt-4 bg-primary/10 p-4 rounded-lg shadow-sm">
        <p className="font-semibold mb-2 text-center text-primary text-base md:text-lg">
          Приглашайте друзей и зарабатывайте до 100% от их дохода в UNI и TON!
        </p>
        <p className="mb-2">
          С первого уровня — вы получаете 100% от фарминга приглашённого.
        </p>
        <p className="mb-2">
          Стройте глубокую сеть до 20 уровней и получайте стабильный доход с каждого уровня.
        </p>
        <p className="font-medium">
          Пассивный доход растёт вместе с вашей командой!
        </p>
      </div>
    </div>
  );
};

export default UniFarmReferralLink;