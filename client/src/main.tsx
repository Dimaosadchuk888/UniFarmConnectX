import { createRoot } from "react-dom/client";
// import "./index.css"; // Временно отключено
import SimpleApp from "./SimpleApp";

// Простая инициализация без сложной логики DOM
console.log('[UniFarm] Запуск приложения...');

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<SimpleApp />);
  console.log('[UniFarm] Приложение успешно запущено');
} else {
  console.error('[UniFarm] Элемент #root не найден');
}