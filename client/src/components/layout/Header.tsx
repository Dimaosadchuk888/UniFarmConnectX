import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="p-4 flex justify-between items-center">
      <div className="flex items-center">
        <div className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          UniFarm
        </div>
      </div>
      <button className="gradient-button text-white px-3 py-1.5 rounded-full text-sm font-medium">
        <i className="fas fa-wallet mr-1"></i> Подключить TON
      </button>
    </header>
  );
};

export default Header;
