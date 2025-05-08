import React from 'react';
// Экспорт напрямую из нового файла
import { MissionsList } from '@/components/missions/MissionsListNew';

const Missions: React.FC = () => {
  console.log('Rendering Missions page');
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
      <MissionsList />
    </div>
  );
};

export default Missions;
