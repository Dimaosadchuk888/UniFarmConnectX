/**
 * Приветственная секция дашборда
 */
import React from 'react';
import { Card, CardContent } from '../../../shared/components/ui/card';
import type { User } from '../../../core/types';

interface WelcomeSectionProps {
  user: User;
}

export const WelcomeSection: React.FC<WelcomeSectionProps> = ({ user }) => {
  const displayName = user.username || `Пользователь #${user.id}`;
  const isGuest = !!user.guest_id;
  const userType = isGuest ? 'Гость' : 'Пользователь';

  return (
    <Card className="w-full bg-gradient-to-r from-primary/10 to-secondary/10">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Добро пожаловать, {displayName}!
            </h1>
            <p className="text-muted-foreground mt-1">
              {userType} • ID: {user.id}
            </p>
            {user.ref_code && (
              <p className="text-sm text-muted-foreground mt-1">
                Реферальный код: {user.ref_code}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">
              Общий баланс
            </div>
            <div className="text-xl font-semibold">
              {Number(user.balance_uni || '0').toFixed(2)} UNI
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};