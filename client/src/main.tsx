import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Простая инициализация без сложной логики DOM
console.log('[UniFarm Debug] main.tsx начинает загрузку...');
console.log('[UniFarm Debug] DOM загружен:', document.readyState);

const rootElement = document.getElementById("root");
console.log('[UniFarm Debug] Root element:', rootElement);

if (rootElement) {
  console.log('[UniFarm Debug] Создаем React root...');
  const root = createRoot(rootElement);
  console.log('[UniFarm Debug] Рендерим App компонент...');
  root.render(<App />);
  console.log('[UniFarm Debug] Приложение успешно запущено');
} else {
  console.error('[UniFarm Debug] Элемент #root не найден в DOM');
  document.body.innerHTML = '<div style="padding: 20px; text-align: center;">Ошибка: элемент #root не найден</div>';
}