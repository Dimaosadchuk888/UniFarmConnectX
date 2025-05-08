import React from 'react';
// Импортируем из корректного места
import MissionsList from '@/components/missions';

const Missions: React.FC = () => {
  console.log('Rendering Missions page - Simple version');
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
      <MissionsList />
    </div>
  );
};

export default Missions;
