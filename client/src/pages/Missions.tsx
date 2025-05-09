import React from 'react';
import { SafeMissionsList } from '@/components/missions/SafeMissionsList';

/**
 * Компонент страницы миссий с прямыми вызовами API без использования React Query
 * Реализует ТЗ "Настроить вызов именно на /missions и обеспечить корректную загрузку карточек"
 * Использует специальный компонент SafeMissionsList для прямого доступа к API
 */
const Missions: React.FC = () => {
  console.log('Rendering Missions page - Safe API version (v3)');
  
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-white mb-4">Выполняй задания — получай UNI</h1>
      <SafeMissionsList />
    </div>
  );
};

export default Missions;
