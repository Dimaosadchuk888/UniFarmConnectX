import React, { useState, useEffect } from 'react';
import userService, { User } from '@/services/userService';
import { useQuery } from '@tanstack/react-query';

// Определяем, находимся ли мы в режиме разработки
const IS_DEV = process.env.NODE_ENV === 'development';

const ReferralLinkCard: React.FC = () => {
  // Состояние для отображения таймера загрузки
  const [showLoading, setShowLoading] = useState(true);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  
  // Получаем информацию о текущем пользователе из API
  const { data: currentUser, isLoading: isUserLoading } = useQuery<User>({
    queryKey: ['/api/me'],
    queryFn: () => userService.getCurrentUser(),
    staleTime: 1000 * 60 * 1, // Кэшируем данные на 1 минуту (уменьшено)
    retry: 3, // Три попытки запроса
  });
  
  // Эффект для показа лоадера максимум на 3 секунды (по ТЗ)
  useEffect(() => {
    // Сначала всегда показываем лоадер, независимо от наличия данных в кэше
    setShowLoading(true);
    setLoadingTimedOut(false);
    
    // Логируем ref_code в режиме разработки
    if (IS_DEV) {
      console.log('ref_code:', currentUser?.ref_code);
      console.log('[ReferralLinkCard] Loading state:', {
        isUserLoading,
        hasUser: !!currentUser,
        hasRefCode: !!currentUser?.ref_code,
        refCode: currentUser?.ref_code || 'не определен'
      });
    }
    
    // Если загрузка данных завершена
    if (!isUserLoading) {
      // Если получен ref_code, убираем лоадер немедленно
      if (currentUser?.ref_code) {
        if (IS_DEV) console.log('[ReferralLinkCard] Ref code found, hiding loader');
        setShowLoading(false);
        setLoadingTimedOut(false);
      } else {
        // Если нет ref_code - показываем сообщение об ошибке после 3-секундного таймера
        if (IS_DEV) console.log('[ReferralLinkCard] No ref code found, setting timeout for error message');
        const timer = setTimeout(() => {
          setShowLoading(false);
          setLoadingTimedOut(true);
        }, 3000); // 3 секунды по новому ТЗ
        
        return () => clearTimeout(timer);
      }
    } else {
      // Ограничиваем время показа лоадера даже если загрузка продолжается
      const maxLoadingTimer = setTimeout(() => {
        setShowLoading(false);
        // Проверяем наличие ref_code, чтобы определить, показывать ли сообщение об ошибке
        if (currentUser && typeof currentUser === 'object') {
          // Делаем безопасную проверку на наличие ref_code
          const user = currentUser as User; // TypeScript приведение типа
          setLoadingTimedOut(!user.ref_code);
        } else {
          setLoadingTimedOut(true); // Если данных пользователя нет или нет ref_code - показываем ошибку
        }
      }, 3000);
      
      return () => clearTimeout(maxLoadingTimer);
    }
  }, [isUserLoading, currentUser]);
  
  // Формируем реферальную ссылку, используя ref_code
  let referralLink = '';
  
  // Получаем ref_code из данных пользователя
  const refCode = currentUser?.ref_code;
  
  // Проверяем наличие ref_code и формируем ссылку независимо от наличия Telegram WebApp
  if (refCode) {
    // Используем корректный формат для Telegram Mini App по ТЗ
    // Формат строго такой: https://t.me/UniFarmingBot/app?startapp=ref_КОД
    referralLink = `https://t.me/UniFarmingBot/app?startapp=ref_${refCode}`;
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
        {(isUserLoading || showLoading) && (
          <div className="flex justify-center items-center py-3">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
            <span className="text-sm text-muted-foreground">Получение ссылки...</span>
          </div>
        )}
        
        {/* Сообщение о проблеме загрузки, когда нет ссылки (оранжевое, не красное) */}
        {!isUserLoading && !refCode && loadingTimedOut && (
          <div className="flex justify-center items-center py-3 px-2 bg-amber-500/10 rounded-lg">
            <i className="fas fa-exclamation-circle text-amber-500/80 mr-2"></i>
            <span className="text-sm text-amber-500/80">Не удалось получить ссылку. Попробуйте позже.</span>
          </div>
        )}
        
        {/* Отображаем ссылку только если она сгенерирована (есть refCode) - БЕЗ зависимости от Telegram WebApp */}
        {!showLoading && refCode && (
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
        )}
      </div>
      
      {/* Секция с статистикой */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Блок с приглашенными друзьями */}
        <div 
          className="bg-black/20 p-4 rounded-lg backdrop-blur-sm cursor-pointer transition-all duration-300 hover:bg-black/30"
          onClick={playInviteDemo}
        >
          <h3 className="text-md font-medium text-white/90 mb-2 flex items-center">
            <i className="fas fa-users text-blue-400 mr-2 text-sm"></i>
            Приглашённые друзья
          </h3>
          
          <div className="flex items-center">
            <p className={`
              text-xl font-bold
              ${isDemoPlaying ? 'text-blue-400 animate-pulse' : 'text-white'}
            `}>
              {isDemoPlaying ? '1' : '0'}
            </p>
          </div>
        </div>
        
        {/* Блок с доходом */}
        <div className="bg-black/20 p-4 rounded-lg backdrop-blur-sm">
          <h3 className="text-md font-medium text-white/90 mb-2 flex items-center">
            <i className="fas fa-coins text-accent mr-2 text-sm"></i>
            Доход от партнёров
          </h3>
          
          {isDemoPlaying ? (
            <div>
              <div className="flex items-center mb-1">
                <i className="fas fa-leaf text-green-400 mr-2 text-xs"></i>
                <p className={`
                  text-lg font-bold text-green-400
                  ${isDemoPlaying ? 'animate-pulse' : ''}
                `}>
                  +{isDemoPlaying ? '100' : '0'} UNI
                </p>
              </div>
              <div className="flex items-center">
                <i className="fas fa-tenge text-blue-400 mr-2 text-xs"></i>
                <p className={`
                  text-lg font-bold text-blue-400
                  ${isDemoPlaying ? 'animate-pulse' : ''}
                `}>
                  +{isDemoPlaying ? '1.234' : '0'} TON
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center mb-1">
                <i className="fas fa-leaf text-green-400/50 mr-2 text-xs"></i>
                <p className="text-lg font-bold text-green-400/50">
                  +0 UNI
                </p>
              </div>
              <div className="flex items-center">
                <i className="fas fa-tenge text-blue-400/50 mr-2 text-xs"></i>
                <p className="text-lg font-bold text-blue-400/50">
                  +0 TON
                </p>
              </div>
              <p className="text-gray-500 text-xs italic mt-1">Пока нет начислений</p>
            </div>
          )}
        </div>
        
        {/* Декоративная линия, соединяющая элементы при активации демо */}
        {isDemoPlaying && (
          <div 
            className="absolute h-px bg-gradient-to-r from-blue-400 to-accent"
            style={{
              bottom: '165px',
              left: '25%',
              right: '25%',
              opacity: 0.5,
              animation: 'pulse-fade 1s infinite'
            }}
          ></div>
        )}
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