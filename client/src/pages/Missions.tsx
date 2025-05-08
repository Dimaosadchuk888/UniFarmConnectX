import React from 'react';
// Импортируем непосредственно компонент
import { SimpleMissionsList } from '@/components/missions/SimpleMissionsList';

const Missions: React.FC = () => {
  console.log('Rendering Missions page - Simple version');
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
      <SimpleMissionsList />
    </div>
  );
};

export default Missions;
