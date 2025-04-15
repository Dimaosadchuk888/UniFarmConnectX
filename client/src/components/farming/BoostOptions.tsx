import React, { useState } from 'react';
import { BOOST_PACKAGES } from '@/lib/constants';

const BoostOptions: React.FC = () => {
  // Состояние для активного пакета при наведении
  const [hoveredPackId, setHoveredPackId] = useState<number | null>(null);
  
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-white mb-3">Boost</h2>
      
      {BOOST_PACKAGES.map((pack) => {
        const isHovered = hoveredPackId === pack.id;
        
        return (
          <div 
            key={pack.id}
            className={`
              bg-card rounded-xl p-4 mb-3 shadow-lg 
              transition-all duration-300 card-hover-effect
              ${pack.isPrimary ? 'border border-primary relative overflow-hidden' : ''}
            `}
            onMouseEnter={() => setHoveredPackId(pack.id)}
            onMouseLeave={() => setHoveredPackId(null)}
          >
            {/* Фоновый эффект для главного пакета */}
            {pack.isPrimary && (
              <div 
                className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50 z-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(162, 89, 255, 0.1) 0%, rgba(0, 0, 0, 0) 60%)',
                  transition: 'opacity 0.3s ease',
                  opacity: isHovered ? 0.8 : 0.5
                }}
              ></div>
            )}
            
            <div className="flex justify-between items-center mb-2 relative z-10">
              <h3 className={`
                text-md font-medium
                transition-all duration-300 
                ${isHovered ? 'transform translate-x-1' : ''}
              `}>{pack.name}</h3>
              
              <div className={`
                px-2 py-1 transition-all duration-300
                ${pack.type === 'UNI' 
                  ? 'bg-primary/20 rounded-full' 
                  : 'bg-muted rounded-full'
                }
                ${isHovered ? 'scale-110' : ''}
              `}>
                <span className={`
                  text-sm 
                  ${pack.type === 'UNI' ? 'text-primary' : 'text-foreground'}
                `}>{pack.type}</span>
              </div>
            </div>
            
            <p className="text-xs text-foreground opacity-70 mb-3 relative z-10">{pack.description}</p>
            
            <button 
              className={`
                relative z-10 transition-all duration-300
                overflow-hidden
                ${pack.isPrimary 
                  ? "gradient-button w-full text-white py-2 rounded-lg font-medium"
                  : "w-full py-2 rounded-lg font-medium border border-muted text-foreground hover:border-primary/50"
                }
                ${isHovered ? 'transform scale-105' : ''}
              `}
            >
              {/* Ripple эффект при наведении на кнопку */}
              {isHovered && (
                <span className="absolute inset-0 flex justify-center items-center overflow-hidden">
                  <span 
                    className="absolute w-full h-full rounded-full" 
                    style={{
                      background: 'radial-gradient(circle, rgba(162, 89, 255, 0.2) 0%, rgba(0, 0, 0, 0) 70%)',
                      animation: 'ripple 1.5s linear infinite',
                      transform: 'scale(0)',
                    }}
                  ></span>
                </span>
              )}
              Купить
            </button>
            
            {/* Индикатор популярности для главного пакета */}
            {pack.isPrimary && (
              <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 rotate-45 bg-primary text-white text-xs px-4 py-1 z-10">
                Популярный
              </div>
            )}
          </div>
        );
      })}
      
      <p className="text-xs text-foreground opacity-70 italic text-center mt-2">
        Оплата через TON будет доступна позже
      </p>
    </div>
  );
};

export default BoostOptions;
