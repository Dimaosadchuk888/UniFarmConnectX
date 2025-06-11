import React from 'react';
import { useUser } from '@/contexts/simpleUserContext';

const IncomeCardNew: React.FC = () => {
  const { uniBalance } = useUser();
  
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  };

  return (
    <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Доходы от фарминга</h3>
        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
      </div>
      
      <div className="space-y-4">
        {/* Общий доход */}
        <div className="bg-black/20 rounded-lg p-4">
          <div className="text-sm text-gray-300 mb-1">Общий доход</div>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xl font-bold text-white">
                {formatNumber(12.5)} UNI/час
              </div>
              <div className="text-sm text-gray-400">
                {formatNumber(300)} UNI/день
              </div>
            </div>
          </div>
        </div>

        {/* UNI Farming */}
        <div className="bg-black/20 rounded-lg p-4">
          <div className="text-sm text-blue-300 mb-1">UNI Farming</div>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-lg font-semibold text-white">
                {formatNumber(10.2)} UNI/час
              </div>
              <div className="text-xs text-gray-400">
                {formatNumber(245)} UNI/день
              </div>
            </div>
          </div>
        </div>

        {/* TON Boost Farming */}
        <div className="bg-black/20 rounded-lg p-4">
          <div className="text-sm text-purple-300 mb-1">TON Boost</div>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-lg font-semibold text-white">
                {formatNumber(2.3)} TON/час
              </div>
              <div className="text-xs text-gray-400">
                {formatNumber(55)} TON/день
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeCardNew;