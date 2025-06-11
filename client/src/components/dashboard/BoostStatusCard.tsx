import React from 'react';

const BoostStatusCard: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Статус бустов</h3>
        <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
          <span className="text-white/80">UNI Farming</span>
          <span className="text-green-400 text-sm">Активен</span>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
          <span className="text-white/80">TON Boost</span>
          <span className="text-gray-400 text-sm">Неактивен</span>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
          <span className="text-white/80">Ежедневный бонус</span>
          <span className="text-yellow-400 text-sm">Доступен</span>
        </div>
      </div>
    </div>
  );
};

export default BoostStatusCard;