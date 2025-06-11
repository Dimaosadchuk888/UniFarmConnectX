import React from 'react';

const ChartCard: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">График доходности</h3>
        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
      </div>
      
      <div className="h-32 bg-black/20 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-white/60 text-sm">График временно недоступен</div>
          <div className="text-white/40 text-xs mt-1">Загрузка данных...</div>
        </div>
      </div>
    </div>
  );
};

export default ChartCard;