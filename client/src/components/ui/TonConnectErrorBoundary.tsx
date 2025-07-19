import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

interface TonConnectErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function TonConnectErrorFallback({ error, resetErrorBoundary }: TonConnectErrorFallbackProps) {
  console.error('[TonConnectErrorBoundary] Критическая ошибка TON Connect:', error.message);
  
  return (
    <div className="flex flex-col items-center justify-center p-6 border border-destructive/20 rounded-lg bg-destructive/5">
      <h3 className="text-lg font-semibold text-destructive mb-2">
        Ошибка подключения TON Connect
      </h3>
      <p className="text-sm text-muted-foreground text-center mb-4">
        Произошла критическая ошибка при инициализации TON Connect.
      </p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Повторить попытку
      </button>
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 w-full">
          <summary className="text-xs text-muted-foreground cursor-pointer">
            Техническая информация
          </summary>
          <pre className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded overflow-auto">
            {error.message}
          </pre>
        </details>
      )}
    </div>
  );
}

interface TonConnectErrorBoundaryProps {
  children: React.ReactNode;
}

export default function TonConnectErrorBoundary({ children }: TonConnectErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={TonConnectErrorFallback}
      onError={(error, errorInfo) => {
        console.error('[TonConnectErrorBoundary] TON Connect error caught:', {
          error: error.message,
          stack: error.stack,
          errorInfo
        });
      }}
      onReset={() => {
        console.log('[TonConnectErrorBoundary] Resetting TON Connect error boundary');
        // Можно добавить дополнительную логику сброса состояния
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}