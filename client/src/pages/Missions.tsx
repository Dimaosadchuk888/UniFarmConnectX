import React from 'react';
import MissionsList from '@/components/missions/MissionsList';

const Missions: React.FC = () => {
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
      <MissionsList />
    </div>
  );
};

export default Missions;
