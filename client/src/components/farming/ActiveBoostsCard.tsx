import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, differenceInDays, format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ActiveBoostsCardProps {
  userId: number;
}

const ActiveBoostsCard: React.FC<ActiveBoostsCardProps> = ({ userId }) => {
  // Получаем список активных буст-пакетов
  const { data: bootsResponse, isLoading, isError } = useQuery({
    queryKey: [`/api/boosts/active?user_id=${userId}`],
    refetchInterval: 60000, // Обновляем данные каждую минуту
  });
  
  const activeBoosts = (bootsResponse as any)?.data || [];
  
  // Если нет активных бустов, не отображаем компонент
  if (!isLoading && !isError && activeBoosts.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-card rounded-xl p-4 mt-8 shadow-md transition-all duration-300 hover:shadow-lg">
      <h2 className="text-xl font-semibold mb-4">Активные Boost-пакеты</h2>
      
      {isLoading && (
        <div className="text-center py-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2 text-sm text-foreground opacity-70">Загрузка...</p>
        </div>
      )}
      
      {isError && (
        <div className="p-4 bg-red-900/30 border border-red-500 rounded-lg text-center">
          <p className="text-red-300">Не удалось загрузить активные буст-пакеты</p>
        </div>
      )}
      
      {!isLoading && !isError && activeBoosts.length > 0 && (
        <div className="space-y-4">
          {activeBoosts.map((boost: any) => {
            // Форматируем даты
            const createdAt = new Date(boost.created_at);
            const expiresAt = boost.expires_at ? new Date(boost.expires_at) : null;
            
            // Рассчитываем процент прогресса (дней прошло / всего дней)
            const daysTotal = 365; // буст активен 365 дней
            const daysLeft = expiresAt ? differenceInDays(expiresAt, new Date()) : 0;
            const daysUsed = daysTotal - daysLeft;
            const progressPercent = Math.min(100, Math.max(0, (daysUsed / daysTotal) * 100));
            
            // Определяем имя буста
            const boostName = boost.boostPackage?.name || `Boost ${boost.boost_id}`;
            
            return (
              <div 
                key={boost.id} 
                className="bg-slate-800 rounded-lg p-4 border border-indigo-900"
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold">{boostName}</h3>
                  <span className="text-sm py-1 px-2 bg-indigo-900/50 rounded-full text-indigo-300">
                    Активен
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-xs text-foreground opacity-70">Создан</p>
                    <p className="text-sm">
                      {format(createdAt, 'dd.MM.yyyy', { locale: ru })}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-foreground opacity-70">Истекает</p>
                    <p className="text-sm">
                      {expiresAt 
                        ? format(expiresAt, 'dd.MM.yyyy', { locale: ru })
                        : 'Бессрочно'}
                    </p>
                  </div>
                </div>
                
                <div className="mb-3">
                  <p className="text-xs text-foreground opacity-70">Доходность</p>
                  <p className="text-sm text-[#6DBFFF]">
                    +{boost.rate_ton}% TON в день
                  </p>
                </div>
                
                {expiresAt && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Прогресс</span>
                      <span>
                        {daysUsed} / {daysTotal} дней ({Math.round(progressPercent)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full" 
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                    <p className="text-xs mt-1 text-right text-foreground opacity-70">
                      {daysLeft > 0 
                        ? `Осталось: ${daysLeft} дней`
                        : 'Срок действия истёк'}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActiveBoostsCard;