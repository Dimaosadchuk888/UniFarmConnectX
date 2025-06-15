import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/contexts/userContext';

// Dashboard Components
import WelcomeSection from '@/components/dashboard/WelcomeSection';
import IncomeCardNew from '@/components/dashboard/IncomeCardNew';
import ChartCard from '@/components/dashboard/ChartCard';
import BoostStatusCard from '@/components/dashboard/BoostStatusCard';
import DailyBonusCard from '@/components/dashboard/DailyBonusCard';

import UniFarmingCardWithErrorBoundary from '@/components/farming/UniFarmingCardWithErrorBoundary';

const Dashboard: React.FC = () => {
  const { userId, isFetching } = useUser();

  // Получаем данные пользователя для передачи в компоненты
  const { data: userResponse, isLoading, error } = useQuery<{ success: boolean; data: any }>({
    queryKey: [`/api/v2/users/profile`],
    enabled: !!userId,
    retry: false,
    retryOnMount: false
  });

  const userData = userResponse?.data || null;

  // Показываем загрузку если данные еще загружаются
  if (isFetching || isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Загрузка дашборда...</p>
        </div>
      </div>
    );
  }

  // Показываем безопасное состояние при ошибке авторизации
  if (error && !userId) {
    return (
      <div className="space-y-5 pb-6 min-h-full">
        {/* Основная секция приветствия - работает без авторизации */}
        <WelcomeSection />
        
        {/* Демонстрационный режим для неавторизованных пользователей */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Демонстрационный режим
            </p>
            <p className="text-xs text-muted-foreground">
              Откройте приложение через Telegram для полного функционала
            </p>
          </div>
        </div>
        
        {/* Базовые компоненты без требования авторизации */}
        <ChartCard />
        <BoostStatusCard />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6 min-h-full">
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
      <UniFarmingCardWithErrorBoundary userData={userData} />
    </div>
  );
};

export default Dashboard;