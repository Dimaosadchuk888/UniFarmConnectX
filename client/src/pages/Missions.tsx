import React from 'react';
import { DirectMissionsComponent } from '@/components/missions/DirectMissions';

/**
 * Компонент страницы миссий с прямыми вызовами API без использования React Query
 * Реализует ТЗ "Настроить вызов именно на `/missions` и обеспечить корректную загрузку карточек"
 * Использует компонент DirectMissionsComponent, который полностью независим от React Query
 * и использует только базовый fetch для API-запросов
 */
const Missions: React.FC = () => {
  console.log('Rendering Missions page - Direct fetch version (v4)');
  
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
      <DirectMissionsComponent />
    </div>
  );
};

export default Missions;
