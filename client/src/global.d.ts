declare global {
  var ErrorBoundaryContext: React.Context<{
    error: Error | null;
    setError: (error: Error | null) => void;
    clearError: () => void;
  } | undefined>;
}

export {};