import React from 'react';

const FarmingStatusCard: React.FC = () => {
  return (
    <div className="bg-card rounded-xl p-4 mb-5 shadow-lg">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-foreground opacity-70">Текущий доход</p>
          <p className="text-lg font-semibold green-gradient-text">0 UNI / сутки</p>
        </div>
        <div>
          <p className="text-sm text-foreground opacity-70">Активный Boost</p>
          <p className="text-md">—</p>
        </div>
        <div>
          <p className="text-sm text-foreground opacity-70">Начисление</p>
          <p className="text-md green-gradient-text font-medium">0 UNI / сек</p>
        </div>
      </div>
    </div>
  );
};

export default FarmingStatusCard;
