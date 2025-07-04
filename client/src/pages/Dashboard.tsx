import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/contexts/userContext';

// Dashboard Components
import WelcomeSection from '@/components/dashboard/WelcomeSection';
import IncomeCardNew from '@/components/dashboard/IncomeCardNew';
import ChartCard from '@/components/dashboard/ChartCard';
import BoostStatusCard from '@/components/dashboard/BoostStatusCard';
import DailyBonusCard from '@/components/dashboard/DailyBonusCard';
import SystemStatusIndicator from '@/components/ui/SystemStatusIndicator';
import UniFarmingCardWithErrorBoundary from '@/components/farming/UniFarmingCardWithErrorBoundary';
import SimpleReferralCard from '@/components/referral/SimpleReferralCard';

const Dashboard: React.FC = () => {
  const { userId } = useUser();

  // Получаем данные пользователя для передачи в компоненты
  const { data: userResponse } = useQuery<{ success: boolean; data: any }>({
    queryKey: [`/api/v2/users/profile`],
    enabled: !!userId
  });

  const userData = userResponse?.data || null;

  return (
    <div className="p-4 space-y-5 min-h-full">
      {/* Основная секция приветствия */}
      <WelcomeSection />
      
      {/* Карточка доходов - временно отключена для диагностики */}
      {/* <IncomeCardNew /> */}
      
      {/* График доходности */}
      <ChartCard />
      
      {/* Статус бустов */}
      <BoostStatusCard />
      
      {/* Ежедневный бонус */}
      <DailyBonusCard />

      {/* UNI Фарминг карточка */}
      <UniFarmingCardWithErrorBoundary userData={userData} />

      {/* Партнерская программа - временно отключена */}
      {/* <ReferralStats /> */}

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