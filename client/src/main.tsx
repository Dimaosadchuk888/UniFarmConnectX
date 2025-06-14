import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ReplitErrorBoundaryContext } from "./contexts/ReplitErrorBoundaryContext";

// Telegram WebApp debugging logs
console.log('=== TELEGRAM WEBAPP DEBUG START ===');
console.log('Current URL:', window.location.href);
console.log('User Agent:', navigator.userAgent);
console.log('Is Telegram available:', typeof window.Telegram !== 'undefined');

if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
  const tg = window.Telegram.WebApp;
  console.log('Telegram WebApp available');
  console.log('initData:', tg.initData);
  console.log('initData length:', tg.initData.length);
  console.log('initDataUnsafe:', JSON.stringify(tg.initDataUnsafe, null, 2));
  console.log('Platform:', tg.platform);
  console.log('Version:', tg.version);
  console.log('Is expanded:', tg.isExpanded);
  console.log('Viewport height:', tg.viewportHeight);
  
  if (tg.initDataUnsafe?.user) {
    console.log('User ID:', tg.initDataUnsafe.user.id);
    console.log('Username:', tg.initDataUnsafe.user.username);
    console.log('First name:', tg.initDataUnsafe.user.first_name);
  } else {
    console.log('❌ No user data in initDataUnsafe');
  }
  
  if (!tg.initData || tg.initData.length === 0) {
    console.log('❌ initData is empty or missing');
  }
} else {
  console.log('❌ Telegram WebApp not available');
  console.log('Window.Telegram:', window.Telegram);
}
console.log('=== TELEGRAM WEBAPP DEBUG END ===');

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