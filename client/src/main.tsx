import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ErrorBoundaryContext } from "./contexts/ErrorBoundaryContext";

// Простая инициализация без сложной логики DOM
console.log('[UniFarm] Запуск приложения...');

// Make ErrorBoundaryContext globally available for @replit/vite-plugin-runtime-error-modal
(window as any).ErrorBoundaryContext = ErrorBoundaryContext;

// Create a fallback global context if the plugin expects it in a different format
if (typeof window !== 'undefined') {
  (window as any).React = React;
  (window as any).ErrorBoundaryContext = ErrorBoundaryContext;
}

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
  console.log('[UniFarm] Приложение успешно запущено');
} else {
  console.error('[UniFarm] Элемент #root не найден');
}