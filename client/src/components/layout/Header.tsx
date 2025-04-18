import React from 'react';

/**
 * Компонент Header с официальной кнопкой TonConnect
 * Содержит:
 * 1. Контейнер для TonConnectUI (div с id="ton-connect-button")
 */
const Header: React.FC = () => {
  return (
    <header className="fixed top-0 right-0 p-2 z-50">
      <div className="flex justify-end">
        {/* 
          Кнопка для подключения TonConnect кошелька
          TonConnectUI использует этот DOM-элемент для рендера кнопки
        */}
        <div id="ton-connect-button" className="ton-connect-button"></div>
      </div>
    </header>
  );
};

export default Header;