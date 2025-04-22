import React, { useState } from 'react';

interface FallbackReferralLinkProps {
  refCode: string;
}

/**
 * Упрощенный компонент для отображения реферальной ссылки в fallback режиме.
 * Используется когда window.Telegram недоступен.
 */
const FallbackReferralLink: React.FC<FallbackReferralLinkProps> = ({ refCode }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Формируем реферальную ссылку с правильным URL
  const referralLink = `https://t.me/UniFarming_Bot/UniFarm?startapp=ref_${refCode}`;
  
  // Отладочное логирование
  console.debug('FallbackReferralLink rendered', { refCode, referralLink });
  
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
    <div className="mt-4 mb-2">
      <div className="p-2 bg-amber-500/10 rounded-lg mb-2">
        <p className="text-xs text-amber-400">
          <i className="fas fa-info-circle mr-1"></i>
          Fallback режим активен. Telegram WebApp не обнаружен.
        </p>
      </div>
      
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

export default FallbackReferralLink;