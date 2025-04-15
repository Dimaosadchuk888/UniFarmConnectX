import React from 'react';
import { NAV_ITEMS } from '@/lib/constants';

interface NavigationBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-primary/10 flex justify-center px-1 py-2 z-10 shadow-lg shadow-black/30">
      <div className="flex justify-between w-full max-w-md px-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`
                flex flex-col items-center justify-center py-1 px-1 w-1/5 
                transition-all duration-300 ease-in-out
                ${isActive ? 'active-nav-item' : 'text-gray-500 hover:text-gray-300'}
              `}
              onClick={() => setActiveTab(item.id)}
            >
              <div className={`
                w-9 h-9 flex items-center justify-center mb-1 rounded-full
                ${isActive ? 'bg-primary/10' : ''}
                transition-all duration-300 ease-in-out
              `}>
                <i className={`
                  fas fa-${item.icon} 
                  ${isActive ? 'text-primary text-lg' : 'text-base text-gray-400'}
                  transition-all duration-300 ease-in-out
                `}></i>
              </div>
              <span className={`
                text-xs font-medium whitespace-nowrap tracking-tight
                transition-all duration-300 ease-in-out
                ${isActive ? 'opacity-100' : 'opacity-80'}
              `}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default NavigationBar;