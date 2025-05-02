import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Глобальный компонент ErrorBoundary для React-приложения
 * Отлавливает и обрабатывает ошибки в дочерних компонентах,
 * предотвращая "падение" всего приложения
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Обновляем состояние, чтобы при следующем рендере показать fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Логируем ошибку в консоль
    console.error('[ErrorBoundary] Перехвачена ошибка в компоненте:', error, errorInfo);
    
    // Сохраняем информацию об ошибке для отображения
    this.setState({
      errorInfo
    });
    
    // Здесь можно реализовать отправку ошибки в систему мониторинга
    // или выполнить другие действия по обработке ошибки
  }
  
  handleReset = (): void => {
    try {
      // Сбрасываем состояние ошибки, чтобы попытаться восстановить работу
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
    } catch (resetError) {
      console.error('[ErrorBoundary] Ошибка при сбросе состояния:', resetError);
    }
  };

  render(): ReactNode {
    // Если есть ошибка, показываем запасной UI
    if (this.state.hasError) {
      // Если передан кастомный fallback, используем его
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Стандартный fallback UI
      return (
        <div className="p-4 border border-red-200 rounded-md bg-red-50 text-red-700 my-4">
          <h3 className="text-lg font-semibold mb-2">Что-то пошло не так</h3>
          <p className="mb-4">Возникла ошибка при отображении этого компонента.</p>
          
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <div className="mb-4">
              <p className="font-mono text-sm bg-red-100 p-2 rounded">
                {this.state.error.toString()}
              </p>
              {this.state.errorInfo && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm">Стек ошибки</summary>
                  <pre className="mt-2 text-xs overflow-auto p-2 bg-red-100 rounded max-h-40">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          )}
          
          <button
            onClick={this.handleReset}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      );
    }

    // Если ошибки нет, рендерим дочерние компоненты
    return this.props.children;
  }
}

export default ErrorBoundary;