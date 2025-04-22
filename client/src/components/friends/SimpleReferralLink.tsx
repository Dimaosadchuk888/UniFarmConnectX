import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import userService from '@/services/userService';

// Импортируем тип User из userService
import { User } from '@/services/userService';

/**
 * Максимально упрощенный компонент для отображения реферальной ссылки
 * ВАЖНО: По ТЗ компонент должен показывать ссылку только на основании наличия ref_code,
 * игнорируя состояние Telegram WebApp и другие условия.
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
    ? `https://t.me/UniFarming_Bot/UniFarm?startapp=ref_${refCode}`
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

  // Дополнительная отладочная функция для логирования ссылки
  useEffect(() => {
    // Важное отладочное сообщение для тестирования, всегда выводить в консоль
    if (refCode) {
      console.log('✅ [ОТЛАДКА] РЕФ КОД НАЙДЕН:', refCode);
      console.log('📋 [ОТЛАДКА] ССЫЛКА ДЛЯ КОПИРОВАНИЯ:', referralLink);
    } else if (!isLoading) {
      console.log('❌ [ОТЛАДКА] РЕФ КОД ОТСУТСТВУЕТ', { userData: user });
    }
  }, [refCode, referralLink, isLoading, user]);

  // Максимально упрощенный рендеринг без лишних условий
  // ВАЖНО: Логика рендеринга максимально прямолинейная:
  // 1. Если загрузка - показываем лоадер
  // 2. Если есть ref_code - показываем ссылку
  // 3. Если нет ref_code (после загрузки) - показываем сообщение об ошибке
  return (
    <div className="bg-gradient-to-br from-black/40 to-purple-900/20 p-4 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium flex items-center">
          <i className="fas fa-link text-primary mr-2"></i>
          Партнёрская ссылка
        </h3>
        {refCode && (
          <div className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full">
            Код: {refCode}
          </div>
        )}
      </div>
      
      {/* Упрощенная логика отображения: лоадер или содержимое */}
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
          <span className="text-gray-300 text-sm">Получение ссылки...</span>
        </div>
      ) : (
        <>
          {/* Если refCode существует - показываем ссылку */}
          {refCode ? (
            <div className="space-y-3">
              <div className="bg-black/60 p-3 rounded-lg shadow-inner overflow-x-auto">
                <pre className="text-green-400 text-sm whitespace-pre-wrap break-all font-mono">
                  {referralLink}
                </pre>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-400">
                  Поделитесь этой ссылкой с друзьями
                </div>
                <button
                  onClick={copyToClipboard}
                  className={`
                    text-sm px-4 py-1.5 rounded-lg flex items-center
                    ${isCopied 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-primary hover:bg-primary/90'
                    } 
                    text-white transition-colors shadow-md
                  `}
                >
                  <i className={`fas ${isCopied ? 'fa-check' : 'fa-copy'} mr-1.5`}></i>
                  {isCopied ? 'Скопировано!' : 'Копировать'}
                </button>
              </div>
            </div>
          ) : (
            // Если refCode отсутствует - показываем ошибку
            <div className="bg-red-900/20 p-3 rounded-lg flex flex-col items-center">
              <i className="fas fa-exclamation-triangle text-amber-500 text-lg mb-2"></i>
              <p className="text-amber-400 text-sm text-center mb-1">
                Реферальный код не найден в ответе API
              </p>
              <p className="text-xs text-gray-400 text-center">
                Попробуйте обновить страницу или перезапустить приложение
              </p>
            </div>
          )}
          
          {/* Отладочная информация в свернутом виде */}
          <details className="mt-4 text-xs">
            <summary className="text-blue-400 cursor-pointer mb-1">
              Данные для отладки (кликните чтобы развернуть)
            </summary>
            <div className="bg-black/40 p-2 rounded-lg">
              <p className="text-white/80 font-mono whitespace-pre-wrap">
                <strong>API Response:</strong> {JSON.stringify({
                  id: user?.id,
                  telegram_id: user?.telegram_id,
                  username: user?.username,
                  ref_code: user?.ref_code || '[ОТСУТСТВУЕТ]'
                }, null, 2)}
              </p>
            </div>
          </details>
        </>
      )}
    </div>
  );
};

export default SimpleReferralLink;