import React from 'react';
import QueryErrorBoundary from '@/components/common/QueryErrorBoundary';
import MissionStats from './MissionStats';

/**
 * Компонент-обертка с ErrorBoundary для статистики миссий
 * Отображает состояние ошибки для повышения устойчивости приложения
 */
const MissionStatsWithErrorBoundary: React.FC = () => {
  return (
    <QueryErrorBoundary
      fallbackRender={({ error }) => (
        <div className="p-4 bg-red-950/30 border border-red-800 rounded-lg my-4">
          <h3 className="text-lg font-semibold text-red-200 mb-2">
            Не удалось загрузить статистику миссий
          </h3>
          <p className="text-sm text-red-300">
            Произошла ошибка при получении данных. Пожалуйста, повторите попытку позже.
          </p>
          <p className="text-xs text-red-400 mt-2">
            Детали ошибки: {error.message || 'Неизвестная ошибка'}
          </p>
        </div>
      )}
    >
      <MissionStats />
    </QueryErrorBoundary>
  );
};

export default MissionStatsWithErrorBoundary;