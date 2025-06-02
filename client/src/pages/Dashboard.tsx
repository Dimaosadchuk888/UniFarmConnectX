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



// Farming Components
import UniFarmingCardWithErrorBoundary from '@/components/farming/UniFarmingCardWithErrorBoundary';
import FarmingHistoryWithErrorBoundary from '@/components/farming/FarmingHistoryWithErrorBoundary';

const Dashboard: React.FC = () => {
  const { userId } = useUser();

  // Получаем данные пользователя для передачи в компоненты
  const { data: userResponse } = useQuery<{ success: boolean; data: any }>({
    queryKey: [`/api/v2/users/profile`],
    enabled: !!userId
  });

  const userData = userResponse?.data || null;

  return (
    <div className="space-y-5">
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

      {/* UNI Фарминг */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
          <i className="fas fa-seedling text-primary mr-2"></i>
          UNI Фарминг
        </h2>
        <UniFarmingCardWithErrorBoundary userData={userData} />
      </div>

      {/* История фарминга */}
      {userId && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <i className="fas fa-history text-primary mr-2"></i>
            История фарминга
          </h2>
          <FarmingHistoryWithErrorBoundary userId={userId} />
        </div>
      )}

      {/* Индикатор статуса системы для диагностики */}
      {process.env.NODE_ENV !== 'production' && (
        <SystemStatusIndicator />
      )}
    </div>
  );
};

export default Dashboard;