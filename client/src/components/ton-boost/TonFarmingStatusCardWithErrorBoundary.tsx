import React from 'react';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
import TonFarmingStatusCard from './TonFarmingStatusCard';

const TonFarmingStatusCardWithErrorBoundary: React.FC = () => {
  return (
    <ErrorBoundary fallback={
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-400 mb-2">TON Farming Status Error</h3>
        <p className="text-red-300">Failed to load TON farming status. Please refresh the page.</p>
      </div>
    }>
      <TonFarmingStatusCard />
    </ErrorBoundary>
  );
};

export default TonFarmingStatusCardWithErrorBoundary;