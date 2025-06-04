import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { userService } from '../modules/auth/userService';
import { DashboardLayout } from '../modules/dashboard/components/DashboardLayout';
import type { User } from '../core/types';

const Dashboard: React.FC = () => {
  // Получаем данные пользователя с улучшенной валидацией
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ['/api/me'],
    queryFn: () => userService.getCurrentUser(),
    retry: 3,
    retryDelay: 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-6">
          <h2 className="text-xl font-semibold mb-2">Ошибка загрузки</h2>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Не удалось загрузить данные пользователя'}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }

  return <DashboardLayout user={user} />;
};

export default Dashboard;