import React from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import ActiveTonBoostsCard from './ActiveTonBoostsCard';

const ActiveTonBoostsCardWithErrorBoundary: React.FC = () => {
  return (
    <ErrorBoundary fallback={
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-400 mb-2">Active TON Boosts Error</h3>
        <p className="text-red-300">Failed to load active TON boosts. Please refresh the page.</p>
      </div>
    }>
      <ActiveTonBoostsCard />
    </ErrorBoundary>
  );
};

export default ActiveTonBoostsCardWithErrorBoundary;