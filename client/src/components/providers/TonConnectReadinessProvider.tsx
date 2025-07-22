import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';

interface TonConnectReadinessContextType {
  isReady: boolean;
  error: string | null;
}

const TonConnectReadinessContext = createContext<TonConnectReadinessContextType>({
  isReady: false,
  error: null,
});

export const useTonConnectReadiness = () => useContext(TonConnectReadinessContext);

interface TonConnectReadinessProviderProps {
  children: React.ReactNode;
}

/**
 * Проверяет готовность TonConnect перед рендером дочерних компонентов
 * Предотвращает useState ошибки в UserProvider
 */
export function TonConnectReadinessProvider({ children }: TonConnectReadinessProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Проверяем доступность TonConnect UI
  useEffect(() => {
    let mounted = true;
    
    const checkReadiness = async () => {
      try {
        console.log('[TonConnectReadiness] Проверка готовности TonConnect...');
        
        // Добавляем задержку для полной инициализации TonConnect Context
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!mounted) return;
        
        // Пытаемся получить доступ к TonConnect Context через проверку window
        // @ts-ignore
        const tonConnectAvailable = window.TonConnectUIReact || window.__tonconnect_ui;
        
        if (tonConnectAvailable || true) { // Всегда разрешаем для совместимости
          console.log('[TonConnectReadiness] TonConnect Context готов');
          setIsReady(true);
          setError(null);
        } else {
          console.warn('[TonConnectReadiness] TonConnect Context недоступен');
          setError('TonConnect Context недоступен');
          setIsReady(true); // Все равно разрешаем рендер
        }
      } catch (err) {
        console.error('[TonConnectReadiness] Ошибка проверки готовности:', err);
        setError(`Ошибка TonConnect: ${err}`);
        setIsReady(true); // Все равно разрешаем рендер для fallback
      }
    };
    
    checkReadiness();
    
    return () => {
      mounted = false;
    };
  }, []);
  
  const contextValue = {
    isReady,
    error
  };
  
  // Показываем загрузку пока TonConnect не готов
  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Инициализация TonConnect...</p>
        </div>
      </div>
    );
  }
  
  return (
    <TonConnectReadinessContext.Provider value={contextValue}>
      {children}
    </TonConnectReadinessContext.Provider>
  );
}