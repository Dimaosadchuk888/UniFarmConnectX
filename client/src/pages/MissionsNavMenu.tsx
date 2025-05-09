import React, { useEffect } from 'react';
import { SafeMissionsList } from '@/components/missions/SafeMissionsList';

// Специальная версия страницы миссий для навигации через меню
const MissionsNavMenu: React.FC = () => {
  console.log('Rendering MissionsNavMenu - Специальная версия для навигации через меню');
  
  // Сбрасываем кеш при навигации через меню
  useEffect(() => {
    console.log('MissionsNavMenu mounted - очищаем кеш и устанавливаем флаги');
    
    // Очистка при размонтировании
    return () => {
      console.log('MissionsNavMenu unmounted - очищаем ресурсы');
    };
  }, []);
  
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
      <SafeMissionsList key="nav-menu-missions" forceRefresh={true} />
    </div>
  );
};

export default MissionsNavMenu;