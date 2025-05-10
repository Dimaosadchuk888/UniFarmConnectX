import React from 'react';
import QueryErrorBoundary from '@/components/common/QueryErrorBoundary';
import TonFarmingStatusCard from './TonFarmingStatusCard';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/userContext';

/**
 * Компонент, оборачивающий TonFarmingStatusCard в ErrorBoundary
 * для обеспечения устойчивости к ошибкам
 */
const TonFarmingStatusCardWithErrorBoundary: React.FC = () => {
  const queryClient = useQueryClient();
  const { userId } = useUser();
  
  // Обработчик сброса состояния ошибки и инвалидации данных
  const handleReset = () => {
    queryClient.invalidateQueries({ 
      queryKey: ['/api/ton-farming/status', userId] 
    });
  };
  
  return (
    <QueryErrorBoundary
      onReset={handleReset}
      queryKey={['/api/ton-farming/status', userId]}
      errorTitle="Ошибка загрузки статуса TON фарминга"
      errorDescription="Не удалось загрузить информацию о вашем TON фарминге. Пожалуйста, обновите страницу или повторите позже."
      resetButtonText="Обновить данные"
    >
      <TonFarmingStatusCard />
    </QueryErrorBoundary>
  );
};

export default TonFarmingStatusCardWithErrorBoundary;