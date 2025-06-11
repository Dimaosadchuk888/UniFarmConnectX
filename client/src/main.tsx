import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('[UniFarm] Начало загрузки main.tsx');

const rootElement = document.getElementById('root');
if (rootElement) {
  console.log('[UniFarm] Элемент root найден, создаем React приложение');
  
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log('[UniFarm] React приложение запущено');
} else {
  console.error('[UniFarm] Элемент #root не найден');
}