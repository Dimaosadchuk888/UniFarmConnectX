import React from 'react';

/**
 * Компонент Header с официальной кнопкой TonConnect
 * Используется оригинальная кнопка TonConnect через DOM-элемент
 */
const Header: React.FC = () => {
  // Стилизованный заголовок с правильной разметкой для кнопки TonConnect
  return (
    <header className="fixed top-0 right-0 p-2 z-50">
      <div className="flex justify-end">
        {/* 
          Здесь ничего не размещаем - приложение уже использует TonConnect
          и инициализирует его в App.tsx через initTonConnect()
        */}
        <div id="ton-connect-root"></div>
      </div>
    </header>
  );
};

export default Header;