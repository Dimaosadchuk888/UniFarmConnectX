import React from 'react';

interface UniFarmingCardWithErrorBoundaryProps {
  userData: any;
}

/**
 * Компонент UNI Фарминга для демонстрации
 */
const UniFarmingCardWithErrorBoundary: React.FC<UniFarmingCardWithErrorBoundaryProps> = ({ userData }) => {
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
          Подключите Telegram для начала фарминга
        </div>
      </div>
    </div>
  );
};

export default UniFarmingCardWithErrorBoundary;