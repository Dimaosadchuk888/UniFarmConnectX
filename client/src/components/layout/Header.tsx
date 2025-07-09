import React from 'react';
import { TonConnectButton } from '@tonconnect/ui-react';
import TelegramCloseButton from '../telegram/TelegramCloseButton';
import LanguageSelector from '../telegram/LanguageSelector';

/**
 * Компонент Header с официальной кнопкой TonConnect, выбором языка и кнопкой закрытия
 * Используется TonConnectButton из @tonconnect/ui-react
 */
const Header: React.FC = () => {
  return (
    <header className="fixed top-0 right-0 p-2 z-50">
      <div className="flex justify-end gap-2 items-center">
        {/* 
          Официальная кнопка для подключения TonConnect кошелька
          TonConnectButton управляется через TonConnectUIProvider из App.tsx
        */}
        <TonConnectButton />
      </div>
    </header>
  );
};

export default Header;