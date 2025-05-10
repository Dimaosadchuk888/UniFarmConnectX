import React from 'react';
import QueryErrorBoundary from '@/components/common/QueryErrorBoundary';
import ActiveBoostsCard from './ActiveBoostsCard';
import { useUser } from '@/contexts/userContext';
import { useQueryClient } from '@tanstack/react-query';

interface ActiveBoostsCardWithErrorBoundaryProps {
  userId: number;
}

/**
 * Компонент, оборачивающий ActiveBoostsCard в ErrorBoundary
 * для обеспечения устойчивости к ошибкам
 */
const ActiveBoostsCardWithErrorBoundary: React.FC<ActiveBoostsCardWithErrorBoundaryProps> = ({ userId }) => {
  const queryClient = useQueryClient();
  
  // Обработчик сброса состояния ошибки и инвалидации данных
  const handleReset = () => {
    queryClient.invalidateQueries({ 
      queryKey: ['/api/user-boosts', userId] 
    });
  };
  
  return (
    <QueryErrorBoundary
      onReset={handleReset}
      queryKey={['/api/user-boosts', userId]}
      errorTitle="Ошибка загрузки активных бустов"
      errorDescription="Не удалось загрузить информацию о ваших активных бустах. Пожалуйста, обновите страницу или повторите позже."
      resetButtonText="Обновить данные"
    >
      <ActiveBoostsCard userId={userId} />
    </QueryErrorBoundary>
  );
};

export default ActiveBoostsCardWithErrorBoundary;