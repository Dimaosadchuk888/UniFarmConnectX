import React from 'react';
import QueryErrorBoundary from '@/components/common/QueryErrorBoundary';
import MissionStats from './MissionStats';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/userContext';

/**
 * Компонент, оборачивающий MissionStats в ErrorBoundary
 * для обеспечения устойчивости к ошибкам
 */
const MissionStatsWithErrorBoundary: React.FC = () => {
  const queryClient = useQueryClient();
  const { userId } = useUser();
  
  // Обработчик сброса состояния ошибки и инвалидации данных
  const handleReset = () => {
    if (userId) {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/missions/stats', userId] 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['/api/missions/user', userId] 
      });
    }
  };
  
  return (
    <QueryErrorBoundary
      onReset={handleReset}
      queryKey={userId ? ['/api/missions/stats', userId] : undefined}
      errorTitle="Ошибка загрузки статистики миссий"
      errorDescription="Не удалось загрузить вашу статистику по миссиям. Пожалуйста, обновите страницу или повторите позже."
      resetButtonText="Обновить статистику"
    >
      <MissionStats />
    </QueryErrorBoundary>
  );
};

export default MissionStatsWithErrorBoundary;