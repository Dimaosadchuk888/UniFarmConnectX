/**
 * Основной макет дашборда с новой модульной архитектурой
 */
import React from 'react';
import { WelcomeSection } from './WelcomeSection';
import { UniFarmingCard } from '../../farming/components/UniFarmingCard';
import { BalanceCard } from '../../wallet/components/BalanceCard';
import type { User } from '../../../core/types';

interface DashboardLayoutProps {
  user: User;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ user }) => {
  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <WelcomeSection user={user} />
      
      <div className="grid gap-4 md:grid-cols-2">
        <BalanceCard user={user} />
        <UniFarmingCard user={user} />
      </div>
    </div>
  );
};