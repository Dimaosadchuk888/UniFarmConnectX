import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ErrorBoundaryContextType {
  error: Error | null;
  setError: (error: Error | null) => void;
  clearError: () => void;
}

const ErrorBoundaryContext = createContext<ErrorBoundaryContextType | undefined>(undefined);

interface ErrorBoundaryProviderProps {
  children: ReactNode;
}

export const ErrorBoundaryProvider: React.FC<ErrorBoundaryProviderProps> = ({ children }) => {
  const [error, setError] = useState<Error | null>(null);

  const clearError = () => {
    setError(null);
  };

  const value = {
    error,
    setError,
    clearError
  };

  return (
    <ErrorBoundaryContext.Provider value={value}>
      {children}
    </ErrorBoundaryContext.Provider>
  );
};

export const useErrorBoundary = () => {
  const context = useContext(ErrorBoundaryContext);
  if (context === undefined) {
    throw new Error('useErrorBoundary must be used within an ErrorBoundaryProvider');
  }
  return context;
};

export { ErrorBoundaryContext };
export default ErrorBoundaryContext;