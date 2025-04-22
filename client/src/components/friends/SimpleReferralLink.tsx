import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import userService from '@/services/userService';

interface User {
  id: number;
  telegram_id: number;
  username: string;
  balance_uni: string;
  balance_ton: string;
  ref_code: string;
}

/**
 * Максимально упрощенный компонент для отображения реферальной ссылки
 * Без дополнительной проверки условий, анимаций и пр.
 */
const SimpleReferralLink: React.FC = () => {
  const [isCopied, setIsCopied] = useState(false);

  // Прямой запрос к API для получения данных
  const { data, isLoading } = useQuery({
    queryKey: ['/api/me'],
    queryFn: () => userService.getCurrentUser(),
    staleTime: 0, // Без кэширования
  });

  // Получаем ref_code из данных API
  const user = data as User | undefined;
  const refCode = user?.ref_code;
  
  // Формируем ссылку
  const referralLink = refCode 
    ? `https://t.me/UniFarming_Bot/app?startapp=ref_${refCode}`
    : '';

  // Копирование в буфер обмена
  const copyToClipboard = () => {
    if (!referralLink) return;
    
    try {
      navigator.clipboard.writeText(referralLink);
      setIsCopied(true);
      
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Ошибка копирования:', err);
    }
  };

  // Выводим данные в консоль для диагностики
  useEffect(() => {
    console.log('[SimpleReferralLink] Received data:', {
      success: !!data,
      userData: user,
      refCode,
      link: referralLink
    });
  }, [data, user, refCode, referralLink]);

  // Простой рендеринг без лишних условий
  return (
    <div className="bg-black/30 p-4 rounded-lg">
      <h3 className="text-white font-medium mb-3">Простая реферальная ссылка</h3>
      
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-400 text-sm">Загрузка...</span>
        </div>
      ) : (
        <>
          {refCode ? (
            <div className="space-y-2">
              <div className="bg-gray-900 p-2 rounded overflow-x-auto">
                <pre className="text-green-400 text-xs whitespace-pre-wrap break-all">
                  {referralLink}
                </pre>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={copyToClipboard}
                  className={`text-xs px-3 py-1 rounded ${
                    isCopied ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
                  } text-white transition-colors`}
                >
                  {isCopied ? 'Скопировано!' : 'Копировать'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-red-900/20 p-2 rounded">
              <p className="text-red-400 text-sm">
                Реферальный код не найден.
              </p>
            </div>
          )}
          
          <div className="mt-3 bg-blue-900/20 p-2 rounded">
            <p className="text-xs text-blue-300">
              <strong>Данные API:</strong> {
                JSON.stringify({
                  id: user?.id,
                  username: user?.username,
                  ref_code: user?.ref_code
                }, null, 2)
              }
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default SimpleReferralLink;