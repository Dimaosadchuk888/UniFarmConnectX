import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-800 text-white p-4">
      {/* Заголовок */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white">UniFarm</h1>
      </div>

      {/* Баланс */}
      <div className="text-center mb-6">
        <p className="text-gray-300 text-sm mb-2">Ваш баланс</p>
        <div className="text-4xl font-bold text-cyan-400 mb-1">1,250.75</div>
        <p className="text-gray-400 text-sm">UNI Tokens</p>
      </div>

      {/* Активное фермерство */}
      <div className="bg-cyan-400 rounded-xl p-6 mb-6 text-center">
        <div className="flex items-center justify-center mb-2">
          <span className="text-xl mr-2">🌱</span>
          <span className="text-white font-semibold">Активное фермерство</span>
        </div>
        <div className="text-2xl font-bold text-white mb-2">+45.25 UNI</div>
        <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm">
          Собрать награду
        </button>
      </div>

      {/* Статистика сетка 2x2 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-cyan-400">100</div>
          <div className="text-sm text-gray-400">Мощность майнинга</div>
        </div>
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-cyan-400">12</div>
          <div className="text-sm text-gray-400">Рефералы</div>
        </div>
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-cyan-400">7</div>
          <div className="text-sm text-gray-400"></div>
        </div>
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-cyan-400">24ч</div>
          <div className="text-sm text-gray-400"></div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;