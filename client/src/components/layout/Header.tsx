import React from 'react';
import ConnectWalletButton from '../wallet/ConnectWalletButton';

const Header: React.FC = () => {
  return (
    <header className="fixed top-0 right-0 p-2 z-50">
      <div className="flex justify-end">
        <ConnectWalletButton className="shadow-lg" />
      </div>
    </header>
  );
};

export default Header;