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
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Airdrop Boost Пакеты</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {boostPackages.map((boost) => (
          <div 
            key={boost.id} 
            className="bg-card rounded-xl p-4 shadow-md transition-all duration-300 hover:shadow-lg border border-indigo-100 dark:border-indigo-900"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg">{boost.name}</h3>
              <span className="text-cyan-400 font-medium">{boost.price}</span>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-foreground opacity-70">Доход в TON:</span>
                <span className="text-cyan-400 font-medium">{boost.tonDailyYield}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-foreground opacity-70">Бонус UNI:</span>
                <span className="text-primary font-medium">{boost.uniBonus}</span>
              </div>
            </div>
            
            {/* Кнопка Buy Boost (неактивна) */}
            <button 
              className="w-full py-2 px-4 rounded-lg font-medium bg-muted text-foreground opacity-50 cursor-not-allowed"
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