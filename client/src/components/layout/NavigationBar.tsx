import React from 'react';
import { NAV_ITEMS } from '@/lib/constants';

interface NavigationBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-muted flex justify-between px-2 py-2 z-10">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`flex flex-col items-center p-2 w-1/5 ${
            activeTab === item.id ? 'active-nav-item' : 'text-foreground'
          }`}
          onClick={() => setActiveTab(item.id)}
        >
          <i className={`fas fa-${item.icon} text-lg`}></i>
          <span className="text-xs mt-1">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default NavigationBar;
