import React from 'react';
import WelcomeSection from '@/components/dashboard/WelcomeSection';
import IncomeCard from '@/components/dashboard/IncomeCard';
import ChartCard from '@/components/dashboard/ChartCard';
import BoostStatusCard from '@/components/dashboard/BoostStatusCard';
import DailyBonusCard from '@/components/dashboard/DailyBonusCard';
import SystemStatusIndicator from '@/components/ui/SystemStatusIndicator';

const Dashboard: React.FC = () => {
  return (
    <div>
      <WelcomeSection />
      <IncomeCard />
      <ChartCard />
      <BoostStatusCard />
      <DailyBonusCard />

      {/* Индикатор статуса системы для диагностики */}
      {process.env.NODE_ENV !== 'production' && (
        <SystemStatusIndicator />
      )}
    </div>
  );
};

export default Dashboard;