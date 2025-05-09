import React, { useEffect } from 'react';
import { SafeMissionsList } from '@/components/missions/SafeMissionsList';
import { DirectMissionsComponent } from '@/components/missions/DirectMissions';

// Специальная версия страницы миссий для навигации через меню
// Теперь использует DirectMissionsComponent вместо SafeMissionsList
// для предотвращения черного экрана
const MissionsNavMenu: React.FC = () => {
  console.log('Rendering MissionsNavMenu - Специальная версия для навигации через меню (v2)');
  
  // Сбрасываем кеш при навигации через меню
  useEffect(() => {
    console.log('MissionsNavMenu mounted - использует DirectMissionsComponent');
    
    // Очистка при размонтировании
    return () => {
      console.log('MissionsNavMenu unmounted - очищаем ресурсы');
    };
  }, []);
  
  // Используем DirectMissionsComponent, который работает через fetch напрямую
  // без использования React Query или других абстракций
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
      {/* Используем DirectMissionsComponent для надежной загрузки миссий */}
      <DirectMissionsComponent />
    </div>
  );
};

export default MissionsNavMenu;