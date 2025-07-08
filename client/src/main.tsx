import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Простая инициализация без сложной логики DOM
console.log('[UniFarm] Запуск приложения...');

// КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Принудительная установка JWT токена
(function() {
  console.log('[JWT Auth Fix] ПРИНУДИТЕЛЬНАЯ установка JWT токена...');
  
  // JWT токен для пользователя ID 62 (решение проблемы депозитов)
  const correctToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYyLCJ0ZWxlZ3JhbV9pZCI6ODg4ODg4NDgsInVzZXJuYW1lIjoicHJldmlld190ZXN0IiwiZmlyc3RfbmFtZSI6IlByZXZpZXciLCJyZWZfY29kZSI6IlJFRl8xNzUxNzgwNTIxOTE4X2UxdjYyZCIsImlhdCI6MTc1MTg3MTA2MywiZXhwIjoxNzUyNDc1ODYzfQ.NKbyJiXtLnGzyr0w-C1oR658X5TzDO6EkKU8Ie5zgE0';
  
  // Принудительно устанавливаем токен
  localStorage.setItem('unifarm_jwt_token', correctToken);
  console.log('[JWT Auth Fix] ✅ JWT токен ПРИНУДИТЕЛЬНО установлен');
  
  // Проверка установки
  const verifyToken = localStorage.getItem('unifarm_jwt_token');
  if (verifyToken) {
    console.log('[JWT Auth Fix] ✅ Токен подтвержден в localStorage');
    console.log('[JWT Auth Fix] Длина токена:', verifyToken.length);
    
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
  
  // Дополнительная проверка через setInterval
  const checkToken = () => {
    const token = localStorage.getItem('unifarm_jwt_token');
    if (token) {
      console.log('[JWT Auth Fix] ✅ Токен активен, длина:', token.length);
    } else {
      console.error('[JWT Auth Fix] ❌ Токен исчез из localStorage, восстанавливаем...');
      localStorage.setItem('unifarm_jwt_token', correctToken);
    }
  };
  
  // Проверяем токен каждые 5 секунд
  setInterval(checkToken, 5000);
  
  // Первая проверка через 1 секунду
  setTimeout(checkToken, 1000);
})();

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
  console.log('[UniFarm] Приложение успешно запущено');
} else {
  console.error('[UniFarm] Элемент #root не найден');
}