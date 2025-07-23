/**
 * Полный дашборд с завершенной миграцией
 */
import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { userService } from '../../auth/userService';
import { WelcomeSection } from './WelcomeSection';
import { UniFarmingCard } from '../../farming/components/UniFarmingCard';
import { BalanceCardSimple } from '../../wallet/components/BalanceCardSimple';
import { MissionsList } from '../../missions/components/MissionsList';
import { ReferralCard } from '../../referral/components/ReferralCard';
import type { User } from '../../../core/types';

export const CompleteDashboard: React.FC = () => {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ['/api/me'],
    queryFn: () => userService.getCurrentUser(),
    retry: 3,
    retryDelay: 1000,
  });

  // Автоматическая перезагрузка при ошибке аутентификации
  useEffect(() => {
    if (error && error instanceof Error) {
      // Проверяем, является ли это ошибкой аутентификации
      const errorMessage = error.message || '';
      const errorString = JSON.stringify(error);
      
      if (errorMessage.includes('Authentication required') || 
          errorMessage.includes('need_jwt_token') ||
          errorString.includes('Authentication required')) {
        console.log('[CompleteDashboard] Обнаружена ошибка аутентификации, перезагрузка через 2 секунды...');
        
        const timer = setTimeout(() => {
          window.location.href = window.location.href;
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Загрузка UniFarm...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    // Проверяем, является ли это ошибкой аутентификации
    const isAuthError = error instanceof Error && (
      error.message.includes('Authentication required') || 
      error.message.includes('need_jwt_token') ||
      JSON.stringify(error).includes('Authentication required')
    );

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-6">
          <h2 className="text-xl font-semibold mb-2">
            {isAuthError ? 'Загрузка приложения...' : 'Ошибка загрузки'}
          </h2>
          <p className="text-muted-foreground mb-4">
            {isAuthError 
              ? 'Приложение перезагрузится автоматически через несколько секунд' 
              : (error instanceof Error && !error.message.includes('{') 
                  ? error.message 
                  : 'Не удалось загрузить данные пользователя')
            }
          </p>
          {!isAuthError && (
            <button 
              onClick={() => window.location.href = window.location.href + '?refresh=' + Date.now()} 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Обновить страницу
            </button>
          )}
          {isAuthError && (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mt-4"></div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <WelcomeSection user={user} />
      
      <div className="grid gap-4 lg:grid-cols-2">
        <BalanceCardSimple user={user} />
        <UniFarmingCard user={user} />
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        <MissionsList />
        <ReferralCard user={user} />
      </div>
      
      <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="font-semibold text-green-800 mb-2">Миграция завершена</h3>
        <div className="text-sm text-green-700 space-y-1">
          <p>✓ Модульная архитектура (modules/, core/, shared/)</p>
          <p>✓ Исправленная валидация данных пользователя</p>
          <p>✓ Безопасная обработка балансов и фарминга</p>
          <p>✓ Централизованные типы и API клиент</p>
          <p>⚠ WebSocket подключения временно отключены</p>
        </div>
      </div>
    </div>
  );
};