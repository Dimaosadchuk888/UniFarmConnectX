import React from 'react';
import WelcomeSection from '@/components/dashboard/WelcomeSection';
import IncomeCard from '@/components/dashboard/IncomeCard';
import ChartCard from '@/components/dashboard/ChartCard';
import BoostStatusCard from '@/components/dashboard/BoostStatusCard';
import DailyBonusCard from '@/components/dashboard/DailyBonusCard';

const Dashboard: React.FC = () => {
  return (
    <div>
      <WelcomeSection />
      <IncomeCard />
      <ChartCard />
      <BoostStatusCard />
      <DailyBonusCard />
    </div>
  );
};

export default Dashboard;
