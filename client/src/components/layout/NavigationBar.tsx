import React from 'react';
import { NAV_ITEMS } from '@/lib/constants';

interface NavigationBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-b from-black/10 to-card border-t border-primary/10 flex justify-center px-2 py-2 z-10 shadow-lg shadow-black/50">
      <div className="flex justify-between w-full max-w-md px-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              className={`
                flex flex-col items-center justify-center py-1 px-1 w-1/5 relative
                transition-all duration-300 ease-in-out
                ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'}
              `}
              onClick={() => setActiveTab(item.id)}
            >
              <div className={`
                w-10 h-10 flex items-center justify-center 
                rounded-full mb-1
                ${isActive ? 'bg-primary/10 shadow-sm shadow-primary/40' : ''}
                transition-all duration-300 ease-in-out
              `}>
                {/* Эффект подсветки для активной иконки */}
                {isActive && (
                  <div className="absolute w-10 h-10 rounded-full bg-primary/5 animate-pulse-size"></div>
                )}
                
                <i className={`
                  fas fa-${item.icon} 
                  ${isActive ? 'text-xl text-primary' : 'text-lg'}
                  transition-all duration-300 ease-in-out z-10
                `}></i>
              </div>
              
              <span className={`
                text-[11px] font-medium tracking-tight whitespace-nowrap
                transition-all duration-300 ease-in-out
                ${isActive ? 'opacity-100' : 'opacity-80'}
              `}>{item.label}</span>
              
              {/* Подчеркивание активного пункта */}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-10 h-[2px] bg-gradient-to-r from-primary/70 via-primary to-primary/70 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default NavigationBar;
