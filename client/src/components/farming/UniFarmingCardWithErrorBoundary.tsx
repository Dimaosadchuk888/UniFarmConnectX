import React from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import UniFarmingCard from './UniFarmingCard';
import { useUser } from '@/contexts/userContext';

const UniFarmingCardWithErrorBoundary: React.FC = () => {
  const { userData } = useUser();
  
  return (
    <ErrorBoundary fallback={
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-400 mb-2">UNI Farming Error</h3>
        <p className="text-red-300">Failed to load UNI farming data. Please refresh the page.</p>
      </div>
    }>
      <UniFarmingCard userData={userData} />
    </ErrorBoundary>
  );
};

export default UniFarmingCardWithErrorBoundary;