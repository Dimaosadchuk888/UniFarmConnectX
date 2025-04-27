import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import userService from '@/services/userService';
import SimpleReferralLink from '@/components/friends/SimpleReferralLink';
import UniFarmReferralLink from '@/components/friends/UniFarmReferralLink';

/**
 * Минимальная версия страницы партнерской программы для диагностики отображения реферальной ссылки
 * Показывает оба компонента (старый и новый) для сравнения их работы
 * ОБНОВЛЕНО: Добавлен новый компонент UniFarmReferralLink с упрощенной логикой
 */
const FriendsMinimal: React.FC = () => {
  // Состояние для отслеживания привязки к API
  const [apiStatus, setApiStatus] = useState<string>("Загрузка...");
  
  // Прямой запрос на API
  const { data: userData, isLoading } = useQuery({
    queryKey: ['/api/me'], 
    queryFn: () => userService.getCurrentUser(),
    staleTime: 0 // Без кэширования для немедленного обновления
  });
  
  // Отслеживаем изменения в данных
  useEffect(() => {
    if (userData) {
      setApiStatus("Данные получены");
      // Явно логируем полученные данные
      console.log('[FriendsMinimal] User data received:', {
        id: userData.id,
        telegram_id: userData.telegram_id,
        username: userData.username,
        ref_code: userData.ref_code || 'MISSING'
      });
    } else if (isLoading) {
      setApiStatus("Загрузка...");
    } else {
      setApiStatus("Нет данных");
    }
  }, [userData, isLoading]);
  
  // Формируем реферальную ссылку прямо в компоненте
  const referralLink = userData?.ref_code 
    ? `https://t.me/UniFarming_Bot/UniFarm?ref_code=${userData.ref_code}`
    : "";
  
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-red-500 mb-6 animate-pulse">
        МИНИМАЛЬНАЯ ВЕРСИЯ (FRIENDSMINIMAL.TSX) -- 27.04.2025
      </h1>
      
      {/* Новый основной компонент для отображения реферальной ссылки */}
      <div className="mb-6">
        <UniFarmReferralLink />
      </div>
      
      {/* Альтернативный тестовый компонент для сравнения */}
      <div className="mb-6">
        <SimpleReferralLink refLink={referralLink} />
      </div>
      
      {/* Удалено: Здесь был блок "Статистика вашего реферального кода", он удален в соответствии с требованиями */}
      
      {/* Блок с прямым отображением реферальной ссылки */}
      <div className="bg-amber-900/30 rounded-lg p-3 mb-4 text-sm overflow-hidden">
        <h3 className="text-amber-300 font-bold mb-2">
          Реферальная ссылка (прямое отображение)
        </h3>
        
        {referralLink ? (
          <div className="bg-black/30 p-2 rounded overflow-auto">
            <pre className="text-xs text-green-400 break-all font-mono whitespace-pre-wrap">
              {referralLink}
            </pre>
            
            <div className="mt-2 flex justify-end">
              <button 
                className="bg-green-800/40 hover:bg-green-800/60 text-white text-xs py-1 px-3 rounded-full"
                onClick={() => {
                  navigator.clipboard.writeText(referralLink);
                  alert("Ссылка скопирована!");
                }}
              >
                Копировать
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-red-900/30 p-2 rounded">
            <p className="text-xs text-red-400">
              Реферальная ссылка недоступна: отсутствует ref_code
            </p>
          </div>
        )}
      </div>
      
      {/* Блок с инструкциями */}
      <div className="bg-blue-900/20 rounded-lg p-3 overflow-hidden">
        <h3 className="text-blue-300 font-bold mb-2">
          Инструкция
        </h3>
        <p className="text-xs text-white/80">
          Данная страница создана специально для диагностики отображения реферальных ссылок. 
          Здесь используется минимум компонентов и условной логики для максимально простого 
          отображения данных, полученных напрямую из API.
        </p>
      </div>
    </div>
  );
};

export default FriendsMinimal;