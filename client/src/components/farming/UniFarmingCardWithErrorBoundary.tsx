import React from 'react';
import QueryErrorBoundary from '@/components/common/QueryErrorBoundary';
import UniFarmingCard from './UniFarmingCard';
import { useUser } from '@/contexts/userContext';
import { useQueryClient } from '@tanstack/react-query';

interface UniFarmingCardWithErrorBoundaryProps {
  userData: any;
}

/**
 * Компонент, оборачивающий UniFarmingCard в ErrorBoundary
 * для обеспечения устойчивости к ошибкам
 */
const UniFarmingCardWithErrorBoundary: React.FC<UniFarmingCardWithErrorBoundaryProps> = ({ userData }) => {
  const queryClient = useQueryClient();
  const { userId } = useUser();
  
  // Если нет userId, показываем информационную карточку без API запросов
  if (!userId) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 mb-5 shadow-md">
        <h2 className="text-xl font-semibold mb-3 text-primary">Основной UNI пакет</h2>
        
        {/* Состояние "Фарминг не активирован" */}
        <div className="mb-4 p-3 bg-gradient-to-r from-amber-900/30 to-orange-900/20 border border-amber-500/30 rounded-lg flex items-center">
          <div className="flex items-center justify-center w-8 h-8 mr-3 bg-amber-500/20 rounded-full">
            <i className="fas fa-seedling text-amber-300 text-lg"></i>
          </div>
          <div>
            <p className="text-sm text-amber-300 font-medium">
              Фарминг не активирован
            </p>
            <p className="text-xs text-amber-200/70 mt-1">
              Создайте свой первый депозит, чтобы начать получать доход
            </p>
          </div>
        </div>

        {/* Информация о доходности */}
        <div className="mb-4 p-3 bg-gradient-to-r from-indigo-900/30 to-purple-900/20 border border-indigo-500/30 rounded-lg">
          <div className="flex items-center mb-2">
            <i className="fas fa-info-circle text-indigo-300 mr-2"></i>
            <p className="text-sm text-indigo-300 font-medium">Информация о доходности</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <i className="fas fa-circle-check text-green-400 text-xs mr-2"></i>
              <span className="text-xs text-foreground">Ежедневная доходность: 0.5% в день</span>
            </div>
            <div className="flex items-center">
              <i className="fas fa-circle-check text-green-400 text-xs mr-2"></i>
              <span className="text-xs text-foreground">Годовая доходность (APR): 182.5%</span>
            </div>
            <div className="flex items-center">
              <i className="fas fa-circle-check text-green-400 text-xs mr-2"></i>
              <span className="text-xs text-foreground">Начисления: каждую секунду</span>
            </div>
            <div className="flex items-center">
              <i className="fas fa-circle-check text-green-400 text-xs mr-2"></i>
              <span className="text-xs text-foreground">Минимальный депозит: 5 UNI</span>
            </div>
          </div>
        </div>

        {/* Форма депозита */}
        <div className="border border-border rounded-lg p-3">
          <h3 className="text-sm font-medium text-foreground mb-3">
            💰 Создать депозит и активировать фарминг
          </h3>
          
          <div className="mb-3">
            <label className="block text-xs text-muted-foreground mb-1">
              Введите сумму UNI
            </label>
            <input
              type="text"
              placeholder="0.00"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 text-foreground"
              disabled
            />
            <p className="text-xs text-muted-foreground mt-1">
              Доступно: -- UNI
            </p>
          </div>

          <div className="mb-3">
            <p className="text-xs text-muted-foreground">Минимальный депозит</p>
            <p className="text-sm font-medium text-foreground">5 UNI</p>
          </div>

          <button
            disabled
            className="w-full py-2 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-900/20 hover:shadow-green-900/30 text-white font-medium rounded-lg transition-all duration-300 opacity-60 cursor-not-allowed"
          >
            🌱 Активировать фарминг UNI
          </button>
          
          <p className="text-xs text-muted-foreground text-center mt-2">
            Подключите Telegram для начала фарминга
          </p>
        </div>
      </div>
    );
  }
  
  // Обработчик сброса состояния ошибки и инвалидации данных
  const handleReset = () => {
    if (userId) {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/v2/uni-farming/status', userId] 
      });
    }
  };
  
  return (
    <QueryErrorBoundary
      onReset={handleReset}
      queryKey={['/api/v2/uni-farming/status', userId]}
      errorTitle="Ошибка загрузки UNI фарминга"
      errorDescription="Не удалось загрузить информацию о вашем UNI фарминге. Пожалуйста, обновите страницу или повторите позже."
      resetButtonText="Обновить данные"
    >
      <UniFarmingCard userData={userData} />
    </QueryErrorBoundary>
  );
};

export default UniFarmingCardWithErrorBoundary;