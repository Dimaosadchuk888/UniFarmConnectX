import React, { useEffect } from 'react';
import { MissionsList } from '@/components/missions/MissionsList';
import { useQueryClient } from '@tanstack/react-query';

// Специальная версия страницы миссий для навигации через меню
// Использует основной компонент MissionsList
const MissionsNavMenu: React.FC = () => {const queryClient = useQueryClient();
  
  // Сбрасываем кеш при навигации через меню
  useEffect(() => {// Инвалидируем кеш для уверенности в свежести данных
    queryClient.invalidateQueries({
      queryKey: ['/api/missions/active']
    });
    queryClient.invalidateQueries({
      queryKey: ['/api/user_missions']
    });
    
    // Очистка при размонтировании
    return () => {};
  }, [queryClient]);
  
  // Используем стандартный MissionsList
  return (
    <div className="p-0 pb-6 min-h-full">
      <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
      <MissionsList />
    </div>
  );
};

export default MissionsNavMenu;