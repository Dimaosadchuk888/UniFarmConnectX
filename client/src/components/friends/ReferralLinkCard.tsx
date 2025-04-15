import React, { useState, useEffect } from 'react';

const ReferralLinkCard: React.FC = () => {
  // В реальном приложении это пришло бы из данных пользователя
  const referralLink = "https://t.me/UniFarm_bot?start=ref123456";
  
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
      // В реальном приложении здесь будет реальное копирование
      // navigator.clipboard.writeText(referralLink);
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
      className="bg-card rounded-xl p-4 mb-5 shadow-lg card-hover-effect relative overflow-hidden"
      style={{
        opacity, 
        transform: `translateY(${translateY}px)`,
        transition: 'opacity 0.8s ease, transform 0.8s ease'
      }}
    >
      {/* Декоративные элементы фона */}
      <div className="absolute -right-10 -top-10 w-20 h-20 bg-primary/5 rounded-full blur-lg"></div>
      <div className="absolute -left-10 -bottom-10 w-20 h-20 bg-accent/5 rounded-full blur-lg"></div>
      
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-md font-medium">Ваша реферальная ссылка</h2>
        
        {/* Индикатор, активируемый при анимации демонстрации */}
        {isDemoPlaying && (
          <div className="flex items-center text-xs text-accent animate-pulse">
            <i className="fas fa-user-plus mr-1"></i>
            <span>+1 друг</span>
          </div>
        )}
      </div>
      
      <div className="flex mb-4 relative">
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
          <div className="absolute -top-8 right-0 bg-accent/90 text-white text-xs px-2 py-1 rounded shadow-md">
            Скопировано!
          </div>
        )}
      </div>
      
      <div className="flex justify-between relative">
        <div 
          className="cursor-pointer transition-all duration-300 hover:transform hover:scale-105"
          onClick={playInviteDemo}
        >
          <p className="text-xs text-foreground opacity-70">Приглашено</p>
          <p className={`
            text-md font-medium
            ${isDemoPlaying ? 'animate-bounce text-primary' : ''}
          `}>
            {isDemoPlaying ? '1' : '0'} друзей
          </p>
          
          {/* Анимированная подсказка */}
          {!isDemoPlaying && (
            <p className="text-[10px] text-primary/70 mt-1">
              Нажмите, чтобы увидеть демо
            </p>
          )}
        </div>
        
        <div>
          <p className="text-xs text-foreground opacity-70">Доход</p>
          <div className="flex flex-col items-end">
            <p className={`
              text-md font-medium text-accent
              ${isDemoPlaying ? 'animate-bounce' : ''}
            `}>
              {isDemoPlaying ? '10' : '0'} UNI
            </p>
            <p className={`
              text-sm font-medium text-teal-400
              ${isDemoPlaying ? 'animate-bounce' : ''}
              mt-0.5
            `}>
              {isDemoPlaying ? '1' : '0'} TON
            </p>
          </div>
        </div>
        
        {/* Декоративная линия, соединяющая элементы при активации демо */}
        {isDemoPlaying && (
          <div 
            className="absolute h-px bg-gradient-to-r from-primary to-accent"
            style={{
              bottom: '25px', // Позицию линии нужно подвинуть из-за дополнительной строки с TON
              left: '80px',
              right: '80px',
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
