import React from 'react';
import { useUser } from '@/contexts/simpleUserContext';

// Dashboard Components
import WelcomeSection from '@/components/dashboard/WelcomeSection';
import IncomeCardNew from '@/components/dashboard/IncomeCardNew';
import ChartCard from '@/components/dashboard/ChartCard';
import BoostStatusCard from '@/components/dashboard/BoostStatusCard';
import DailyBonusCard from '@/components/dashboard/DailyBonusCard';
import SystemStatusIndicator from '@/components/ui/SystemStatusIndicator';
import UniFarmingCardWithErrorBoundary from '@/components/farming/UniFarmingCardWithErrorBoundary';

const Dashboard: React.FC = () => {
  console.log('[Dashboard] Рендерим Dashboard');
  const { userId } = useUser();
  console.log('[Dashboard] userId:', userId);

  return (
    <div className="p-4 space-y-5 min-h-full">
      {/* Основная секция приветствия */}
      <WelcomeSection />
      
      {/* Карточка доходов */}
      <IncomeCardNew />
      
      {/* График доходности */}
      <ChartCard />
      
      {/* Статус бустов */}
      <BoostStatusCard />
      
      {/* Ежедневный бонус */}
      <DailyBonusCard />

      {/* UNI Фарминг карточка */}
      <UniFarmingCardWithErrorBoundary />

      {/* Индикатор статуса системы для диагностики */}
      {process.env.NODE_ENV !== 'production' && (
        <SystemStatusIndicator />
      )}
      
      {/* Дополнительное пространство внизу для прокрутки */}
      <div className="h-4"></div>
    </div>
  );
};

export default Dashboard;