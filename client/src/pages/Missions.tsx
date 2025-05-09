import React from 'react';
// Импортируем прямую версию компонента списка миссий, которая не использует React Query
import { DirectMissionsList } from '@/components/missions/DirectMissionsList';

const Missions: React.FC = () => {
  console.log('Rendering Missions page - Direct API version');
  
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
      {/* Используем DirectMissionsList который напрямую работает с API без React Query */}
      <DirectMissionsList />
    </div>
  );
};

export default Missions;
