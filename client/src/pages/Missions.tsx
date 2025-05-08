import React from 'react';
// Импортируем безопасную версию компонента списка миссий
import { SafeMissionsList } from '@/components/missions/SafeMissionsList';

const Missions: React.FC = () => {
  console.log('Rendering Missions page - Safe version');
  
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
      <SafeMissionsList />
    </div>
  );
};

export default Missions;
