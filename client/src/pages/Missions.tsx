import React from 'react';
import { MissionsListFixed } from '@/components/missions/MissionsListFixed';

/**
 * Компонент страницы миссий
 * Отображает только карточки миссий без статистики
 */
const Missions: React.FC = () => {
  console.log('Rendering Missions page (v4 - Fixed)');
  
  return (
    <div className="space-y-4 pb-6">
      <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
      
      {/* Исправленные карточки миссий с правильными API endpoints */}
      <MissionsListFixed />
    </div>
  );
};

export default Missions;
