import React from 'react';

const BoostStatusCard: React.FC = () => {
  // Array of 4 boost slots, all empty initially
  const boostSlots = Array(4).fill(null);

  return (
    <div className="bg-card rounded-xl p-4 mb-5 shadow-lg">
      <div className="flex justify-between items-center">
        <h2 className="text-md font-medium">Активные Boost</h2>
        <p className="text-foreground font-medium">0 / 4</p>
      </div>
      <p className="text-xs text-foreground opacity-70 mt-1">Ускорители увеличивают доходность</p>
      
      <div className="mt-4 grid grid-cols-4 gap-2">
        {boostSlots.map((_, index) => (
          <div 
            key={index} 
            className="rounded-lg bg-muted p-2 flex items-center justify-center opacity-50"
          >
            <i className="fas fa-bolt text-xl text-foreground"></i>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BoostStatusCard;
