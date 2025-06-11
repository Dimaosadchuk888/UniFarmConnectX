import React from 'react';

const UniFarmingCardWithErrorBoundary: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-green-900/20 to-blue-900/20 backdrop-blur-sm border border-green-500/30 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">UNI Farming</h3>
        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
      </div>
      
      <div className="text-center py-6">
        <div className="text-4xl text-green-400 mb-4">🌱</div>
        <div className="text-xl font-bold text-white mb-2">Фарминг активен</div>
        <div className="text-sm text-white/60 mb-4">Зарабатывайте UNI токены автоматически</div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-black/20 rounded-lg p-3">
            <div className="text-xs text-gray-400">Заработано</div>
            <div className="text-lg font-semibold text-green-400">1,234 UNI</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3">
            <div className="text-xs text-gray-400">В час</div>
            <div className="text-lg font-semibold text-green-400">12.5 UNI</div>
          </div>
        </div>
        
        <button className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105">
          Собрать урожай
        </button>
      </div>
    </div>
  );
};

export default UniFarmingCardWithErrorBoundary;