import React from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import UniFarmingCard from './UniFarmingCard';
import { useUser } from '@/contexts/userContext';

const UniFarmingCardWithErrorBoundary: React.FC = () => {
  // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Всегда показываем карточку, даже при ошибках контекста
  try {
    const userContext = useUser();
    
    // Логируем контекст пользователя для диагностики
    console.log('[DEBUG] UniFarmingCardWithErrorBoundary - userContext:', {
      userId: userContext?.userId || 'not available',
      username: userContext?.username || 'not available',
      guestId: userContext?.guestId || 'not available',
      telegramId: userContext?.telegramId || 'not available'
    });
    
    // Создаем userData из доступных полей контекста с защитой от undefined
    const userData = {
      id: userContext?.userId || null,
      username: userContext?.username || null,
      guest_id: userContext?.guestId || null,
      telegram_id: userContext?.telegramId || null,
      balance_uni: userContext?.uniBalance || 0,
      balance_ton: userContext?.tonBalance || 0,
      ref_code: userContext?.refCode || null
    };
    
    return (
      <ErrorBoundary fallback={
        <div className="bg-card border border-border rounded-lg p-6 mb-4">
          <div className="text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-seedling text-primary text-2xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">UNI Фарминг</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Зарабатывайте UNI токены пассивно, размещая их в фарминг
              </p>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center py-2 px-3 bg-secondary/30 rounded">
                <span className="text-sm text-muted-foreground">Дневной доход:</span>
                <span className="text-sm font-medium text-accent">0.5% в день</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-secondary/30 rounded">
                <span className="text-sm text-muted-foreground">Минимальная сумма:</span>
                <span className="text-sm font-medium">10 UNI</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-secondary/30 rounded">
                <span className="text-sm text-muted-foreground">Автоначисление:</span>
                <span className="text-sm font-medium text-accent">Каждую секунду</span>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Система загружается, попробуйте обновить позже
            </div>
          </div>
        </div>
      }>
        <UniFarmingCard userData={userData} />
      </ErrorBoundary>
    );
  } catch (contextError) {
    // КРИТИЧЕСКАЯ ЗАЩИТА: Если даже контекст падает, показываем статичную карточку
    console.error('[ERROR] UniFarmingCardWithErrorBoundary - критическая ошибка контекста:', contextError);
    
    return (
      <div className="bg-card border border-border rounded-lg p-6 mb-4">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-seedling text-primary text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">UNI Фарминг</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Зарабатывайте UNI токены пассивно, размещая их в фарминг
            </p>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center py-2 px-3 bg-secondary/30 rounded">
              <span className="text-sm text-muted-foreground">Дневной доход:</span>
              <span className="text-sm font-medium text-accent">0.5% в день</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-secondary/30 rounded">
              <span className="text-sm text-muted-foreground">Минимальная сумма:</span>
              <span className="text-sm font-medium">10 UNI</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-secondary/30 rounded">
              <span className="text-sm text-muted-foreground">Автоначисление:</span>
              <span className="text-sm font-medium text-accent">Каждую секунду</span>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Подключите Telegram для активации фарминга
          </div>
        </div>
      </div>
    );
  }
};

export default UniFarmingCardWithErrorBoundary;