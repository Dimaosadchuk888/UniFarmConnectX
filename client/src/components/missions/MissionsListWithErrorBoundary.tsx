import React from 'react';
import QueryErrorBoundary from '@/components/common/QueryErrorBoundary';
import MissionsList from './MissionsList';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/userContext';

/**
 * Компонент, оборачивающий MissionsList в ErrorBoundary
 * для обеспечения устойчивости к ошибкам
 */
const MissionsListWithErrorBoundary: React.FC = () => {
  const queryClient = useQueryClient();
  const { userId } = useUser();
  
  // Обработчик сброса состояния ошибки и инвалидации данных
  const handleReset = () => {
    queryClient.invalidateQueries({ 
      queryKey: ['/api/missions'] 
    });
    
    if (userId) {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/missions/user', userId] 
      });
    }
  };
  
  return (
    <QueryErrorBoundary
      onReset={handleReset}
      queryKey={['/api/missions']}
      errorTitle="Ошибка загрузки миссий"
      errorDescription="Не удалось загрузить список доступных миссий. Пожалуйста, обновите страницу или повторите позже."
      resetButtonText="Обновить миссии"
    >
      <MissionsList />
    </QueryErrorBoundary>
  );
};

export default MissionsListWithErrorBoundary;