import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User } from '@/services/userService';
import { buildReferralLink, buildDirectBotReferralLink } from '@/utils/referralUtils';

/**
 * Компонент для отображения реферальной ссылки
 * Версия 5.0: Максимально оптимизированная версия, показывающая реферальную 
 * ссылку сразу после получения данных с сервера
 */
const UniFarmReferralLink: React.FC = () => {
  // Состояния UI
  const [isCopied, setIsCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [linkType, setLinkType] = useState<'app' | 'bot'>('app');
  
  // Запрос данных пользователя напрямую с сервера через React Query
  // Обязательно используем queryKey ['/api/me'] для совместимости с остальным кодом
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/me'],
    queryFn: async () => {
      try {
        // Отправляем прямой запрос к API, минуя промежуточные слои
        const response = await fetch('/api/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });

        // Обрабатываем ошибки HTTP без автоматической перезагрузки страницы
        if (!response.ok) {
          console.warn(`[UniFarmReferralLink] HTTP error (${response.status}) при запросе данных`);
          throw new Error(`API error: ${response.status}`);
        }
        
        // Парсим ответ от сервера
        const result = await response.json();

        // Проверяем формат ответа и наличие данных
        if (!result.success || !result.data) {
          console.warn('[UniFarmReferralLink] Некорректный формат ответа от API');
          throw new Error('Invalid API response format');
        }

        // Проверяем наличие реферального кода
        if (!result.data.ref_code) {
          console.warn('[UniFarmReferralLink] В ответе API отсутствует ref_code');
        } else {
          console.log('[UniFarmReferralLink] Реферальный код успешно получен:', result.data.ref_code);
        }
        
        // Возвращаем данные пользователя напрямую
        return result.data as User;
      } catch (error) {
        console.error('[UniFarmReferralLink] Ошибка при запросе данных пользователя:', error);
        throw error;
      }
    },
    retry: 2, // Пробуем повторить запрос 2 раза в случае ошибки
    retryDelay: 1000, // Задержка между повторами 1 секунда
    staleTime: 10000, // Данные считаются свежими в течение 10 секунд
    refetchOnWindowFocus: false, // Отключаем автоматическое обновление при фокусе окна
  });
  
  // Извлекаем реферальный код из данных пользователя
  const refCode = data?.ref_code;
  
  // Формируем ссылки с помощью утилит
  const referralLink = refCode ? buildReferralLink(refCode) : "";
  const directBotLink = refCode ? buildDirectBotReferralLink(refCode) : "";
  
  // Копирование ссылки в буфер обмена
  const copyToClipboard = (type: 'app' | 'bot' = linkType) => {
    const linkToCopy = type === 'app' ? referralLink : directBotLink;
    if (!linkToCopy) return;
    
    try {
      navigator.clipboard.writeText(linkToCopy);
      setIsCopied(true);
      
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      // Fallback для устройств без поддержки clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = linkToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      } catch (fallbackErr) {
        console.error('Не удалось скопировать ссылку:', fallbackErr);
        alert('Не удалось скопировать. Пожалуйста, выделите ссылку вручную и скопируйте.');
      }
    }
  };
  
  // Загрузка данных
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

  // Обработка ошибок: показываем интерфейс с кнопкой для повторного запроса
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Функция для повторной попытки получения данных
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await refetch();
    } catch (error) {
      console.error('[UniFarmReferralLink] Ошибка при повторном запросе:', error);
    } finally {
      setIsRetrying(false);
    }
  };
  
  // Если произошла ошибка или данные отсутствуют
  if (isError || !data || !refCode) {
    return (
      <div className="bg-card rounded-xl p-5 mb-5 shadow-lg relative">
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="text-amber-500 mb-2">
            <i className="fas fa-exclamation-triangle text-xl"></i>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Не удалось загрузить реферальную ссылку
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
            
            {/* Кнопка для полной перезагрузки страницы (запасной вариант) */}
            <button 
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 bg-black/20 rounded-md text-white/80 text-xs hover:text-white hover:bg-black/30 transition-colors"
            >
              <i className="fas fa-redo-alt mr-1"></i>
              <span>Перезагрузить</span>
            </button>
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
          
          {/* Реферальный код */}
          <div className="flex items-center text-sm text-muted-foreground mt-1 sm:mt-0">
            <span className="mr-2">Ваш код:</span>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">{refCode}</span>
          </div>
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
          
          <button 
            className={`
              px-3 py-2 rounded-r-lg relative overflow-hidden
              ${isCopied ? 'bg-accent' : 'bg-primary'}
              transition-all duration-300
            `}
            onClick={() => copyToClipboard(linkType)}
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

        {/* Подсказка о типе ссылки */}
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {linkType === 'app' 
            ? "Ссылка для запуска Mini App в Telegram" 
            : "Ссылка для перехода к диалогу с ботом"
          }
        </p>
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
    </div>
  );
};

export default UniFarmReferralLink;