import React, { useState, useEffect } from 'react';
import userService from '@/services/userService';
import { useQuery } from '@tanstack/react-query';

// Определяем, находимся ли мы в режиме разработки
const IS_DEV = process.env.NODE_ENV === 'development';

const ReferralLinkCard: React.FC = () => {
  // Состояние для отображения ошибки, если не удалось получить ID
  const [error, setError] = useState<boolean>(false);
  
  // Получаем информацию о текущем пользователе из API
  const { data: currentUser, isLoading: isUserLoading, isError } = useQuery({
    queryKey: ['/api/me'],
    queryFn: () => userService.getCurrentUser(),
    staleTime: 1000 * 60 * 5, // Кэшируем данные на 5 минут
    retry: 2, // Пробуем получить данные трижды
  });
  
  // Обработка ошибок через useEffect
  useEffect(() => {
    if (isError) {
      console.error('[ReferralLinkCard] Failed to get user data from API');
      setError(true);
    }
  }, [isError]);

  // Если кеширование уже работает, можно быстро получить пользователя из Telegram
  const telegram = window.Telegram?.WebApp;
  const telegramUserId = telegram?.initDataUnsafe?.user?.id;
  
  // Определяем наличие userId (должен быть получен только из легитимных источников)
  const hasUserId = !!(currentUser?.id || (IS_DEV && telegramUserId));
  
  // Формируем реферальную ссылку только если есть userId
  let userId = '';
  let referralLink = '';
  
  if (hasUserId) {
    // Приоритет: текущий пользователь из API, затем из Telegram (в режиме разработки)
    userId = `user${currentUser?.id || (IS_DEV ? telegramUserId : '')}`;
    referralLink = `https://t.me/UniFarmingBot?start=${userId}`;
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
  
  // Имитация копирования в буфер обмена
  const copyToClipboard = () => {
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
  
  // Демонстрация анимации приглашения (чисто визуальный эффект)
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
        <h3 className="text-md font-medium text-white/90 mb-2 flex items-center">
          <i className="fas fa-link text-primary/90 mr-2 text-sm"></i>
          Реферальная ссылка
        </h3>
        
        {isUserLoading && (
          <div className="flex justify-center items-center py-3">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
            <span className="text-sm text-muted-foreground">Получение ссылки...</span>
          </div>
        )}
        
        {error && (
          <div className="flex flex-col items-center py-3 px-2 bg-red-900/20 rounded-lg">
            <div className="flex items-center text-red-400 mb-2">
              <i className="fas fa-exclamation-circle mr-2"></i>
              <span className="text-sm">Не удалось получить ссылку</span>
            </div>
            <button 
              className="text-xs bg-primary/20 hover:bg-primary/30 transition-colors py-1 px-3 rounded-full"
              onClick={() => window.location.reload()}
            >
              Попробовать снова
            </button>
          </div>
        )}
        
        {!isUserLoading && !error && hasUserId && (
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
                Скопировано!
              </div>
            )}
          </div>
        )}
        
        {/* Если нет userId и не в состоянии загрузки или ошибки */}
        {!isUserLoading && !error && !hasUserId && (
          <div className="flex justify-center items-center py-3 px-2 bg-yellow-900/20 rounded-lg">
            <i className="fas fa-info-circle text-yellow-500 mr-2"></i>
            <span className="text-sm text-yellow-500/90">Не удалось получить ссылку, попробуйте позже</span>
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
