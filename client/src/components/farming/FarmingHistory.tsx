import React from 'react';

const FarmingHistory: React.FC = () => {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-white mb-3">История фарминга</h2>
      <div className="bg-card rounded-xl p-4 shadow-lg">
        <p className="text-center text-sm text-foreground opacity-70 py-10">
          История фарминга пуста
        </p>
      </div>
    </div>
  );
};

export default FarmingHistory;
