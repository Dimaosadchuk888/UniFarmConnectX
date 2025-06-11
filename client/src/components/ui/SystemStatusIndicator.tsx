import React from 'react';

const SystemStatusIndicator: React.FC = () => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-600/30 rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white">Статус системы</h4>
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">API:</span>
          <span className="text-green-400">Онлайн</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">База данных:</span>
          <span className="text-green-400">Подключена</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">WebSocket:</span>
          <span className="text-green-400">Активен</span>
        </div>
      </div>
    </div>
  );
};

export default SystemStatusIndicator;