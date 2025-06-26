import React from 'react';
import { ReferralSystemProduction } from '@/components/friends/ReferralSystemProduction';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

/**
 * Страница партнерской программы с исправленной реферальной системой
 * Показывает полнофункциональную реферальную программу с API интеграцией
 */
const Friends: React.FC = () => {

  return (
    <div className="space-y-6 p-4">
      <ErrorBoundary fallback={<div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">Не удалось загрузить реферальную систему</div>}>
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Партнёрская программа UniFarm
          </h1>
          <p className="text-gray-600">
            Приглашайте друзей и получайте бонусы от их активности
          </p>
        </div>
        
        <ReferralSystemProduction />
      </ErrorBoundary>
    </div>
  );
};

export default Friends;