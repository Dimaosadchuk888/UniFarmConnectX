import React from 'react';

const DailyBonusCard: React.FC = () => {
  return (
    <div className="bg-card rounded-xl p-4 mb-5 shadow-lg">
      <h2 className="text-md font-medium mb-2">Check-in</h2>
      <p className="text-xs text-foreground opacity-70 mb-3">Возвращайся каждый день, чтобы собирать бонусы!</p>
      <button className="gradient-button w-full text-white py-3 rounded-lg font-medium">
        Получить ежедневный бонус
      </button>
    </div>
  );
};

export default DailyBonusCard;
