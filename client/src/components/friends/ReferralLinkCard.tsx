import React from 'react';

const ReferralLinkCard: React.FC = () => {
  // In a real app, this would come from the user's data
  const referralLink = "https://t.me/UniFarm_bot?start=ref123456";
  
  const copyToClipboard = () => {
    // In a real app, this would copy the text to clipboard
    // Here it's just a visual placeholder
  };

  return (
    <div className="bg-card rounded-xl p-4 mb-5 shadow-lg">
      <h2 className="text-md font-medium mb-2">Ваша реферальная ссылка</h2>
      <div className="flex mb-3">
        <input 
          type="text" 
          value={referralLink} 
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
      <div className="flex justify-between">
        <div>
          <p className="text-xs text-foreground opacity-70">Приглашено</p>
          <p className="text-md font-medium">0 друзей</p>
        </div>
        <div>
          <p className="text-xs text-foreground opacity-70">Доход</p>
          <p className="text-md font-medium text-accent">0 UNI</p>
        </div>
      </div>
    </div>
  );
};

export default ReferralLinkCard;
