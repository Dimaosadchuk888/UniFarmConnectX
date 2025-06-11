
import React from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

export const GlobalLoadingIndicator: React.FC = () => {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  
  const isLoading = isFetching > 0 || isMutating > 0;
  
  if (!isLoading) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-500 h-1">
      <div className="h-full bg-blue-600 animate-pulse" />
      <div className="absolute top-1 right-4 text-xs text-blue-600 bg-white px-2 py-1 rounded shadow">
        {isFetching > 0 && `Загружается ${isFetching} запрос${isFetching > 1 ? 'а' : ''}`}
        {isMutating > 0 && `Выполняется ${isMutating} операци${isMutating > 1 ? 'и' : 'я'}`}
      </div>
    </div>
  );
};
