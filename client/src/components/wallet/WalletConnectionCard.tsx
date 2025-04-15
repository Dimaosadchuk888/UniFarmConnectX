import React from 'react';

const WalletConnectionCard: React.FC = () => {
  // Placeholder wallet address
  const walletAddress = "UQxxxxxxxxxxxxxxxxxxxxxxxxx";
  
  const copyToClipboard = () => {
    // In a real app, this would copy the text to clipboard
    // Here it's just a visual placeholder
  };

  return (
    <div className="bg-card rounded-xl p-4 mb-5 shadow-lg">
      <h2 className="text-md font-medium mb-3">Адрес кошелька</h2>
      <div className="flex mb-4">
        <input 
          type="text" 
          value={walletAddress} 
          readOnly
          className="flex-grow bg-muted text-foreground rounded-l-lg px-3 py-2 text-sm"
        />
        <button 
          className="bg-primary text-white px-3 py-2 rounded-r-lg"
          onClick={copyToClipboard}
        >
          <i className="fas fa-copy"></i>
        </button>
      </div>
      <button className="gradient-button w-full text-white py-3 rounded-lg font-medium">
        Подключить кошелёк
      </button>
    </div>
  );
};

export default WalletConnectionCard;
