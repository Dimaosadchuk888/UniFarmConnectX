import React from 'react';

// Определяем структуру буст-пакета
interface BoostPackage {
  id: number;
  name: string;
  price: string;
  tonDailyYield: string;
  uniBonus: string;
}

// Создаем массив с буст-пакетами
const boostPackages: BoostPackage[] = [
  {
    id: 1,
    name: 'Boost 1',
    price: '1 TON',
    tonDailyYield: '+0.5%/день',
    uniBonus: '+10,000 UNI'
  },
  {
    id: 2,
    name: 'Boost 5',
    price: '5 TON',
    tonDailyYield: '+1%/день',
    uniBonus: '+75,000 UNI'
  },
  {
    id: 3,
    name: 'Boost 15',
    price: '15 TON',
    tonDailyYield: '+2%/день',
    uniBonus: '+250,000 UNI'
  },
  {
    id: 4,
    name: 'Boost 25',
    price: '25 TON',
    tonDailyYield: '+2.5%/день',
    uniBonus: '+500,000 UNI'
  }
];

const BoostPackagesCard: React.FC = () => {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-6">Airdrop Boost Пакеты</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {boostPackages.map((boost) => (
          <div 
            key={boost.id} 
            className="bg-card rounded-xl p-6 shadow-lg transition-all duration-300 hover:shadow-xl border border-indigo-200 dark:border-indigo-800 flex flex-col h-full"
            style={{ boxShadow: '0 8px 20px rgba(162, 89, 255, 0.15)' }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xl text-white">{boost.name}</h3>
              <span className="text-[#6DBFFF] font-bold">{boost.price}</span>
            </div>
            
            <div className="mb-6 space-y-4 flex-grow">
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground opacity-70">Доход в TON:</span>
                <span className="text-[#6DBFFF] font-semibold">{boost.tonDailyYield}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground opacity-70">Бонус UNI:</span>
                <span className="text-[#00D364] font-semibold">{boost.uniBonus}</span>
              </div>
            </div>
            
            {/* Кнопка Buy Boost (неактивна, но со стилизацией) */}
            <button 
              className="w-full py-3 px-4 rounded-lg font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white transition-all duration-300 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={true}
            >
              Buy Boost
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BoostPackagesCard;