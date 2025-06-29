import React from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import BoostPackagesCard from './BoostPackagesCard';

const TonBoostPackagesCardWithErrorBoundary: React.FC = () => {
  return (
    <ErrorBoundary fallback={
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-400 mb-2">TON Boost Packages Error</h3>
        <p className="text-red-300">Failed to load TON boost packages. Please refresh the page.</p>
      </div>
    }>
      <BoostPackagesCard />
    </ErrorBoundary>
  );
};

export default TonBoostPackagesCardWithErrorBoundary;