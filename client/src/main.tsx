import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Простая инициализация без сложной логики DOM
console.log('[UniFarm] Запуск приложения...');

// Preview mode auto-auth with correct JWT token
if (window.location.hostname.includes('replit')) {
  const currentToken = localStorage.getItem('unifarm_jwt_token');
  // Update token to the one with correct JWT_SECRET signature
  const correctToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjc0LCJ0ZWxlZ3JhbV9pZCI6OTk5NDg5LCJ1c2VybmFtZSI6InRlc3RfdXNlcl8xNzUyMTI5ODQwOTA1IiwicmVmX2NvZGUiOiJURVNUXzE3NTIxMjk4NDA5MDVfZG9reHYwIiwiaWF0IjoxNzUyMTQyMzE3LCJleHAiOjE3NTI3NDcxMTd9.3_sqiWRB4HCA1imgyw8I9Sx5mYsExf0xk2OuWaqSX9E';
  
  if (currentToken !== correctToken) {
    console.log('[UniFarm] Обновляем JWT токен для Preview режима');
    localStorage.setItem('unifarm_jwt_token', correctToken);
    // Force page reload to apply new token
    window.location.reload();
  }
}

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
  console.log('[UniFarm] Приложение успешно запущено');
} else {
  console.error('[UniFarm] Элемент #root не найден');
}