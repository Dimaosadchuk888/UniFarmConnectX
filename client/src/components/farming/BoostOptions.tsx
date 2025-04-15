import React from 'react';
import { BOOST_PACKAGES } from '@/lib/constants';

const BoostOptions: React.FC = () => {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-white mb-3">Boost</h2>
      
      {BOOST_PACKAGES.map((pack) => (
        <div 
          key={pack.id}
          className={`bg-card rounded-xl p-4 mb-3 shadow-lg ${
            pack.isPrimary ? 'border border-primary' : ''
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-md font-medium">{pack.name}</h3>
            <div className={`px-2 py-1 ${
              pack.type === 'UNI' 
                ? 'bg-primary/20 rounded-full' 
                : 'bg-muted rounded-full'
            }`}>
              <span className={`text-sm ${
                pack.type === 'UNI' ? 'text-primary' : 'text-foreground'
              }`}>{pack.type}</span>
            </div>
          </div>
          <p className="text-xs text-foreground opacity-70 mb-3">{pack.description}</p>
          <button 
            className={pack.isPrimary 
              ? "gradient-button w-full text-white py-2 rounded-lg font-medium"
              : "w-full py-2 rounded-lg font-medium border border-muted text-foreground"
            }
          >
            Купить
          </button>
        </div>
      ))}
      
      <p className="text-xs text-foreground opacity-70 italic text-center mt-2">
        Оплата через TON будет доступна позже
      </p>
    </div>
  );
};

export default BoostOptions;
