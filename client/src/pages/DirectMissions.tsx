import React from 'react';
// Импортируем прямую версию компонента списка миссий
import { DirectMissionsList } from '@/components/missions/DirectMissionsList';

/**
 * Специальная страница миссий, которая использует прямой компонент без React Query
 * Доступна по адресу /direct-missions
 */
const DirectMissions: React.FC = () => {
  console.log('Rendering Missions page - DIRECT VERSION NO QUERY');
  
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-4">Задания (Прямой API) 🔧</h1>
      <p className="text-sm text-gray-400 mb-4">Эта страница использует прямой доступ к API без React Query</p>
      <DirectMissionsList forceRefresh={true} />
    </div>
  );
};

export default DirectMissions;