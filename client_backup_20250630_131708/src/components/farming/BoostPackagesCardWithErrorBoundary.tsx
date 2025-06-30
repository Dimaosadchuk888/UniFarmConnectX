import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import BoostPackagesCard from './BoostPackagesCard';

const BoostPackagesCardWithErrorBoundary: React.FC = () => {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-card rounded-lg">
          <p className="text-muted-foreground">Ошибка загрузки пакетов буста</p>
        </div>
      }
    >
      <BoostPackagesCard />
    </ErrorBoundary>
  );
};

export default BoostPackagesCardWithErrorBoundary;