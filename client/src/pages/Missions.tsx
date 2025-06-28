import React from 'react';
import { MissionsList } from '../components/missions';

/**
 * Компонент страницы миссий
 * Отображает только карточки миссий без статистики
 */
const Missions: React.FC = () => {
  console.log('Rendering Missions page');
  
  return (
    <div className="space-y-4 pb-6">
      <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
      
      {/* Исправленные карточки миссий с правильными API endpoints */}
      <MissionsList />
    </div>
  );
};

export default Missions;
