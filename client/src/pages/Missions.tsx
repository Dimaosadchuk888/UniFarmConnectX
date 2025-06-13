import React from 'react';
import SimpleMissionsList from '@/components/missions/SimpleMissionsList';

/**
 * Компонент страницы миссий
 * Отображает только карточки миссий без статистики
 */
const Missions: React.FC = () => {
  return (
    <div className="p-0 pb-6 min-h-full">
      <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
      
      {/* Простые карточки миссий */}
      <SimpleMissionsList />
    </div>
  );
};

export default Missions;
