import React from 'react';
import QueryErrorBoundary from '@/components/common/QueryErrorBoundary';
import FarmingHistory from './FarmingHistory';
import { useQueryClient } from '@tanstack/react-query';

interface FarmingHistoryWithErrorBoundaryProps {
  userId: number;
}

/**
 * Компонент, оборачивающий FarmingHistory в ErrorBoundary
 * для обеспечения устойчивости к ошибкам
 */
const FarmingHistoryWithErrorBoundary: React.FC<FarmingHistoryWithErrorBoundaryProps> = ({ userId }) => {
  const queryClient = useQueryClient();
  
  // Обработчик сброса состояния ошибки и инвалидации данных
  const handleReset = () => {
    queryClient.invalidateQueries({ 
      queryKey: ['/api/farming/history', userId] 
    });
  };
  
  return (
    <QueryErrorBoundary
      onReset={handleReset}
      queryKey={['/api/farming/history', userId]}
      errorTitle="Ошибка загрузки истории фарминга"
      errorDescription="Не удалось загрузить историю операций фарминга. Пожалуйста, обновите страницу или повторите позже."
      resetButtonText="Обновить данные"
    >
      <FarmingHistory userId={userId} />
    </QueryErrorBoundary>
  );
};

export default FarmingHistoryWithErrorBoundary;