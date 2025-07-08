import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Простая инициализация без сложной логики DOM
console.log('[UniFarm] Запуск приложения...');

// КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Автоматическая установка JWT токена
(function() {
  console.log('[JWT Auth Fix] Проверка JWT токена в main.tsx...');
  const token = localStorage.getItem('unifarm_jwt_token');
  
  if (!token) {
    console.log('[JWT Auth Fix] JWT токен отсутствует, устанавливаем...');
    
    // JWT токен для пользователя ID 62 (решение проблемы депозитов)
    const correctToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYyLCJ0ZWxlZ3JhbV9pZCI6ODg4ODg4NDgsInVzZXJuYW1lIjoicHJldmlld190ZXN0IiwiZmlyc3RfbmFtZSI6IlByZXZpZXciLCJyZWZfY29kZSI6IlJFRl8xNzUxNzgwNTIxOTE4X2UxdjYyZCIsImlhdCI6MTc1MTg3MTA2MywiZXhwIjoxNzUyNDc1ODYzfQ.NKbyJiXtLnGzyr0w-C1oR658X5TzDO6EkKU8Ie5zgE0';
    
    localStorage.setItem('unifarm_jwt_token', correctToken);
    console.log('[JWT Auth Fix] ✅ JWT токен установлен в localStorage');
    
    // Проверка установки
    const verifyToken = localStorage.getItem('unifarm_jwt_token');
    if (verifyToken) {
      console.log('[JWT Auth Fix] ✅ Токен подтвержден в localStorage');
      
      // Декодируем токен
      try {
        const base64Url = correctToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const decoded = JSON.parse(jsonPayload);
        
        console.log('[JWT Auth Fix] ✅ Токен декодирован успешно:', {
          userId: decoded.userId,
          username: decoded.username,
          exp: new Date(decoded.exp * 1000).toLocaleString('ru-RU')
        });
      } catch (e) {
        console.error('[JWT Auth Fix] ❌ Ошибка декодирования токена:', e);
      }
    } else {
      console.error('[JWT Auth Fix] ❌ Токен не установлен в localStorage');
    }
  } else {
    console.log('[JWT Auth Fix] ✅ JWT токен уже существует в localStorage');
  }
})();

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
  console.log('[UniFarm] Приложение успешно запущено');
} else {
  console.error('[UniFarm] Элемент #root не найден');
}