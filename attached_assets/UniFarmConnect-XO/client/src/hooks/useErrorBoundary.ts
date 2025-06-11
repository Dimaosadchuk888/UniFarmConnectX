/**
 * Хук для работы с Error Boundary
 */

import { useErrorBoundary as useReactErrorBoundary } from 'react-error-boundary';
import { log } from '../utils/logger';

export function useErrorBoundary() {
  const { showBoundary } = useReactErrorBoundary();

  const captureError = (error: Error, errorInfo?: { componentStack?: string }) => {
    // Логируем ошибку
    log.error('React Error Boundary triggered', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack
    });

    // Показываем error boundary
    showBoundary(error);
  };

  const handleAsyncError = async (asyncFn: () => Promise<any>, context?: string) => {
    try {
      return await asyncFn();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown async error';
      log.error(`Async error in ${context || 'unknown context'}`, error);
      
      // Создаем обертку для async ошибок
      const wrappedError = new Error(`${context ? `${context}: ` : ''}${errorMessage}`);
      if (error instanceof Error) {
        wrappedError.stack = error.stack;
      }
      
      captureError(wrappedError);
      throw wrappedError;
    }
  };

  return {
    captureError,
    handleAsyncError,
    showBoundary
  };
}

export default useErrorBoundary;