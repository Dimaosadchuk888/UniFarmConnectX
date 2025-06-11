import React from 'react';

/**
 * Компонент Header (упрощенная версия без TonConnect)
 */
const Header: React.FC = () => {
  return (
    <header className="fixed top-0 right-0 p-2 z-50">
      <div className="flex justify-end">
        <div className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
          UniFarm
        </div>
      </div>
    </header>
  );
};

export default Header;