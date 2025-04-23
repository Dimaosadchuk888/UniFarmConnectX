import React, { useState } from 'react';

interface SimpleReferralLinkProps {
  refLink: string;
}

/**
 * Упрощенный компонент для отображения реферальной ссылки без зависимости от Telegram.
 * Всегда отображается независимо от наличия window.Telegram.
 */
const SimpleReferralLink: React.FC<SimpleReferralLinkProps> = ({ refLink }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Используем готовую ссылку, переданную в props
  const referralLink = refLink;
  
  // Отладочное логирование
  console.debug('SimpleReferralLink rendered', { referralLink });
  
  // Копирование в буфер обмена
  const copyToClipboard = () => {
    if (!referralLink) return;
    
    try {
      // Пытаемся скопировать в буфер обмена
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
  
  return (
    <div className="bg-black/20 p-4 rounded-lg backdrop-blur-sm relative mb-4">
      <h3 className="text-md font-medium text-white/90 flex items-center mb-3">
        <i className="fas fa-link text-primary/90 mr-2 text-sm"></i>
        Ваша реферальная ссылка
      </h3>
      
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
  );
};

export default SimpleReferralLink;