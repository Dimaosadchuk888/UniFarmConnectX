import frontendLogger from "../../utils/frontendLogger";
import React, { useState, useEffect } from 'react';

interface SafeUserProviderProps {
  children: React.ReactNode;
}

interface SafeUserState {
  isReady: boolean;
  hasError: boolean;
  errorMessage: string | null;
}

export const SafeUserProvider: React.FC<SafeUserProviderProps> = ({ children }) => {
  const [state, setState] = useState<SafeUserState>({
    isReady: false,
    hasError: false,
    errorMessage: null
  });

  useEffect(() => {
    const initializeSafely = async () => {
      try {
        // Проверяем базовые зависимости
        if (typeof window === 'undefined') {
          throw new Error('Window не доступен');
        }

        // Даем время на загрузку компонентов
        await new Promise(resolve => setTimeout(resolve, 100));

        setState({
          isReady: true,
          hasError: false,
          errorMessage: null
        });

      } catch (error) {
        frontendLogger.error('[SafeUserProvider] Ошибка инициализации:', error);
        setState({
          isReady: false,
          hasError: true,
          errorMessage: error instanceof Error ? error.message : 'Неизвестная ошибка'
        });
      }
    };

    initializeSafely();
  }, []);

  if (state.hasError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Ошибка загрузки
          </h3>
          <p className="text-muted-foreground mb-4">
            Произошла ошибка при инициализации приложения
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }

  if (!state.isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка UniFarm...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};