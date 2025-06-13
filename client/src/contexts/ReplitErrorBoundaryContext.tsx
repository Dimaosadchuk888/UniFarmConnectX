import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ReplitErrorBoundaryContextType {
  error: Error | null;
  setError: (error: Error | null) => void;
  clearError: () => void;
  hasError: boolean;
  reportError: (error: Error, errorInfo?: any) => void;
}

const ReplitErrorBoundaryContext = createContext<ReplitErrorBoundaryContextType | undefined>(undefined);

interface ReplitErrorBoundaryProviderProps {
  children: ReactNode;
}

export const ReplitErrorBoundaryProvider: React.FC<ReplitErrorBoundaryProviderProps> = ({ children }) => {
  const [error, setError] = useState<Error | null>(null);

  const clearError = () => {
    setError(null);
  };

  const reportError = (error: Error, errorInfo?: any) => {setError(error);
  };

  const value = {
    error,
    setError,
    clearError,
    hasError: !!error,
    reportError
  };

  return (
    <ReplitErrorBoundaryContext.Provider value={value}>
      {children}
    </ReplitErrorBoundaryContext.Provider>
  );
};

export const useReplitErrorBoundary = () => {
  const context = useContext(ReplitErrorBoundaryContext);
  if (context === undefined) {
    throw new Error('useReplitErrorBoundary must be used within a ReplitErrorBoundaryProvider');
  }
  return context;
};

export { ReplitErrorBoundaryContext };
export default ReplitErrorBoundaryContext;