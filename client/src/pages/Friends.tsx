import React from 'react';
import ReferralLinkCard from '@/components/friends/ReferralLinkCard';
import ReferralLevelsTable from '@/components/friends/ReferralLevelsTable';

const Friends: React.FC = () => {
  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-4">Партнёрская программа</h1>
      <ReferralLinkCard />
      <ReferralLevelsTable />
    </div>
  );
};

export default Friends;
