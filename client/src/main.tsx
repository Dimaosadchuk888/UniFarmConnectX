import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ReplitErrorBoundaryContext } from "./contexts/ReplitErrorBoundaryContext";

// Простая инициализация без сложной логики DOM// Create a minimal ErrorBoundaryContext implementation for @replit/vite-plugin-runtime-error-modal
const createErrorBoundaryContext = () => {
  const context = React.createContext({
    error: null,
    setError: () => {},
    clearError: () => {},
    hasError: false,
    reportError: () => {}
  });
  return context;
};

// Make ErrorBoundaryContext globally available
if (typeof window !== 'undefined') {
  (window as any).React = React;
  (window as any).ErrorBoundaryContext = createErrorBoundaryContext();
}

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);} else {}