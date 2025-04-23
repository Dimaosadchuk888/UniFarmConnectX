import React, { useState } from 'react';
import SimpleReferralLink from '@/components/friends/SimpleReferralLink';
import { useQuery } from '@tanstack/react-query';
import userService from '@/services/userService';

/**
 * Упрощенный компонент для отображения реферальной ссылки в fallback режиме.
 * Используется когда window.Telegram недоступен или реферальный код недоступен.
 * Самостоятельно запрашивает данные пользователя через API.
 */
const FallbackReferralLink = () => {
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['/api/me'],
    queryFn: () => userService.getCurrentUser(),
    staleTime: 1000 * 60,
  });

  const [isCopied, setIsCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Формируем реферальную ссылку с правильным URL
  const referralLink = currentUser?.ref_code
    ? `https://t.me/UniFarming_Bot/UniFarm?startapp=ref_${currentUser.ref_code}`
    : null;
  
  // Отладочное логирование
  console.debug('FallbackReferralLink rendered', { 
    userId: currentUser?.id, 
    refCode: currentUser?.ref_code, 
    referralLink 
  });
  
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
  
  // Показываем загрузчик, пока данные не получены
  if (isLoading) {
    return <div className="p-4 text-center">Загрузка реферальной ссылки...</div>;
  }

  // Если не получили реферальную ссылку, показываем сообщение об ошибке
  if (!referralLink) {
    return <div className="p-4 text-center text-red-500">Реферальная ссылка не найдена.</div>;
  }

  // Если есть ссылка, используем SimpleReferralLink для отображения
  return (
    <div className="mt-4 mb-2">
      <SimpleReferralLink refLink={referralLink} />
    </div>
  );
};

export default FallbackReferralLink;