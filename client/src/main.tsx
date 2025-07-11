import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Простая инициализация без сложной логики DOM
console.log('[UniFarm] Запуск приложения...');

// JWT Auth Fix removed - system now uses real authentication

// Ensure DOM is fully loaded before rendering
const initializeApp = () => {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    // Small delay to ensure all scripts are loaded
    setTimeout(() => {
      const root = createRoot(rootElement);
      root.render(<App />);
      console.log('[UniFarm] Приложение успешно запущено');
    }, 0);
  } else {
    console.error('[UniFarm] Элемент #root не найден');
  }
};

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}