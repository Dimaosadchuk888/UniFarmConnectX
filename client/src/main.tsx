import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Простая инициализация без сложной логики DOM
console.log('[UniFarm] Запуск приложения...');

// Ensure DOM is fully loaded before rendering
const initializeApp = () => {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<App />);
    console.log('[UniFarm] Приложение успешно запущено');
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