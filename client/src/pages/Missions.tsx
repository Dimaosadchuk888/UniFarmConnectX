import React from 'react';
import { MissionsList } from '@/components/missions/MissionsList';

/**
 * Компонент страницы миссий
 * Использует основной компонент MissionsList с исправленной логикой
 */
const Missions: React.FC = () => {
  console.log('Rendering Missions page (v1)');
  
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
      <MissionsList />
    </div>
  );
};

export default Missions;
