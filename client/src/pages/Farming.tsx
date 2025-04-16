import React from 'react';
import FarmingStatusCard from '@/components/farming/FarmingStatusCard';
import BoostOptions from '@/components/farming/BoostOptions';
import FarmingHistory from '@/components/farming/FarmingHistory';
import UniFarmingCard from '@/components/farming/UniFarmingCard';

const Farming: React.FC = () => {
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-4">Фарминг токенов UNI</h1>
      <UniFarmingCard />
      <FarmingStatusCard />
      <BoostOptions />
      <FarmingHistory />
    </div>
  );
};

export default Farming;
