import React, { useState } from 'react';

const WithdrawalForm: React.FC = () => {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // This would submit the form in a real app
    // Here it's just a visual placeholder
  };

  return (
    <div className="bg-card rounded-xl p-4 shadow-lg">
      <h2 className="text-md font-medium mb-3">Вывод средств</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm text-foreground opacity-70 mb-1">
            TON-адрес получателя
          </label>
          <input 
            type="text" 
            placeholder="Введите TON-адрес" 
            className="w-full bg-muted text-foreground rounded-lg px-3 py-2 text-sm"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-foreground opacity-70 mb-1">
            Сумма для вывода
          </label>
          <div className="flex">
            <input 
              type="number" 
              placeholder="0.00" 
              className="flex-grow bg-muted text-foreground rounded-l-lg px-3 py-2 text-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="bg-muted rounded-r-lg px-3 py-2 text-sm flex items-center">
              UNI
            </div>
          </div>
        </div>
        <button 
          type="submit"
          className="gradient-button w-full text-white py-3 rounded-lg font-medium mt-4"
        >
          Отправить заявку
        </button>
        <p className="text-xs text-foreground opacity-70 text-center mt-1">
          Заявка будет передана администратору
        </p>
      </form>
    </div>
  );
};

export default WithdrawalForm;
