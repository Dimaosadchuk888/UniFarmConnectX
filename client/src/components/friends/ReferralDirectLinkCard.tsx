import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import userService from '@/services/userService';
import { User } from '@/services/userService';

/**
 * Дополнительный независимый компонент для отображения реферальной ссылки
 * Показывает ссылку на основе наличия ref_code, без зависимости от Telegram WebApp
 * Используется в разделе "Партнёрка" как дополнительный индикатор наличия ссылки
 */
const ReferralDirectLinkCard: React.FC = () => {
  // Состояние для отслеживания копирования
  const [isCopied, setIsCopied] = useState(false);
  
  // Используем тот же запрос, что и основной компонент
  const { 
    data, 
    isLoading,
  } = useQuery({
    queryKey: ['/api/me'],
    queryFn: () => userService.getCurrentUser(true),
    staleTime: 5000,
  });
  
  // Безопасное приведение типов
  const safeUser = data as User | undefined;
  const refCode = safeUser?.ref_code;
  
  // Формируем ссылку по тому же формату
  const referralLink = refCode 
    ? `https://t.me/UniFarming_Bot/app?startapp=ref_${refCode}`
    : '';
  
  // Функция копирования в буфер обмена
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
  
  // Если компонент в процессе загрузки или данные ещё не получены
  if (isLoading) {
    return (
      <div className="w-full bg-zinc-900/60 rounded-xl p-4 mb-5 shadow-sm">
        <div className="flex items-center justify-center py-3">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
          <span className="text-sm text-muted-foreground">Получаем ссылку...</span>
        </div>
      </div>
    );
  }
  
  // Если реферальный код отсутствует
  if (!refCode) {
    return (
      <div className="w-full bg-zinc-900/60 rounded-xl p-4 mb-5 shadow-sm">
        <div className="bg-amber-500/10 text-amber-400 p-3 rounded-lg">
          <div className="flex items-center">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            <span>Ссылка ещё не сгенерирована, попробуйте позже.</span>
          </div>
        </div>
      </div>
    );
  }
  
  // Если реферальный код получен успешно
  return (
    <div className="w-full bg-zinc-900/60 rounded-xl p-4 mb-5 shadow-sm">
      <div className="mb-2">
        <h3 className="text-sm font-medium text-white/90">
          Ваша реферальная ссылка
        </h3>
      </div>
      
      <div className="flex relative">
        <input
          type="text"
          value={referralLink}
          readOnly
          className="w-full bg-muted text-foreground rounded-l-lg px-3 py-2 text-sm"
        />
        
        <button
          className={`
            px-3 py-2 rounded-r-lg relative overflow-hidden
            ${isCopied ? 'bg-green-600' : 'bg-primary'}
            transition-all duration-300
          `}
          onClick={copyToClipboard}
        >
          <i className={`
            fas ${isCopied ? 'fa-check' : 'fa-copy'} 
            text-white
          `}></i>
        </button>
        
        {isCopied && (
          <div className="absolute -top-8 right-0 bg-green-600/90 text-white text-xs px-2 py-1 rounded shadow-md animate-fadeIn z-10">
            Ссылка скопирована
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralDirectLinkCard;