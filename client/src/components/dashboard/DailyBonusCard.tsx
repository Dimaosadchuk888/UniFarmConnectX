import React from 'react';

const DailyBonusCard: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Ежедневный бонус</h3>
        <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
      </div>
      
      <div className="text-center py-4">
        <div className="text-3xl text-yellow-400 mb-2">🎁</div>
        <div className="text-xl font-bold text-white mb-2">+100 UNI</div>
        <div className="text-sm text-white/60 mb-4">Ежедневный бонус доступен!</div>
        
        <button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105">
          Получить бонус
        </button>
      </div>
    </div>
  );
};

export default DailyBonusCard;