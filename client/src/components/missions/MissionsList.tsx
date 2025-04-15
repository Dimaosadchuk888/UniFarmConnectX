import React from 'react';
import { MISSIONS } from '@/lib/constants';

const MissionsList: React.FC = () => {
  return (
    <div className="space-y-3">
      {MISSIONS.map((mission) => (
        <div key={mission.id} className="bg-card rounded-xl p-4 shadow-lg">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <i className={`${mission.icon.startsWith('you') ? 'fab' : 'fas'} fa-${mission.icon} text-primary text-xl`}></i>
            </div>
            <div className="ml-3 flex-grow">
              <h3 className="text-md font-medium">{mission.title}</h3>
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-foreground opacity-70">Награда: {mission.reward}</p>
                <button className="px-3 py-1 rounded-lg text-sm font-medium gradient-button text-white">
                  Выполнить
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MissionsList;
