import React from 'react';

const IncomeCard: React.FC = () => {
  return (
    <div className="bg-card rounded-xl p-4 mb-5 shadow-lg">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-md font-medium">Текущий доход</h2>
        <div className="text-right">
          <p className="text-lg font-semibold green-gradient-text">+0.0027 UNI / сек</p>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <p className="text-sm text-foreground opacity-70">Заработано сегодня:</p>
        <p className="text-md font-medium text-accent">134 UNI</p>
      </div>
    </div>
  );
};

export default IncomeCard;
