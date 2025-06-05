import React from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import UniFarmingCard from './UniFarmingCard';
import { useUser } from '@/contexts/userContext';

const UniFarmingCardWithErrorBoundary: React.FC = () => {
  const userContext = useUser();
  
  // Створюємо userData з доступних полів контексту
  const userData = {
    id: userContext.userId,
    username: userContext.username,
    guest_id: userContext.guestId,
    telegram_id: userContext.telegramId,
    balance_uni: userContext.uniBalance,
    balance_ton: userContext.tonBalance,
    ref_code: userContext.refCode
  };
  
  return (
    <ErrorBoundary fallback={
      <div className="bg-card border border-border rounded-lg p-6 mb-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-exclamation-triangle text-red-400 text-2xl"></i>
          </div>
          <h3 className="text-lg font-semibold text-red-400 mb-2">Ошибка загрузки UNI фарминга</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Не удалось загрузить информацию о вашем UNI фарминге. Пожалуйста, обновите страницу или повторите позже.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
          >
            Обновить страницу
          </button>
        </div>
      </div>
    }>
      <UniFarmingCard userData={userData} />
    </ErrorBoundary>
  );
};

export default UniFarmingCardWithErrorBoundary;