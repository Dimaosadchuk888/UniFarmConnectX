// МИНИМАЛЬНАЯ ДИАГНОСТИЧЕСКАЯ ВЕРСИЯ
console.log('🔬 ТЕСТ: JavaScript выполняется!');

import { createRoot } from "react-dom/client";

console.log('🔬 ТЕСТ: React импортирован');

// Простейший компонент
function TestApp() {
  return (
    <div style={{
      color: 'white',
      background: 'blue',
      padding: '30px',
      fontSize: '28px',
      textAlign: 'center'
    }}>
      🎯 ДИАГНОСТИЧЕСКИЙ ТЕСТ РАБОТАЕТ!
      <br/>
      React успешно загружен и отрендерен
      <br/>
      Время: {new Date().toLocaleTimeString()}
    </div>
  );
}

console.log('🔬 ТЕСТ: Компонент создан');

// Рендеринг
function render() {
  console.log('🔬 ТЕСТ: Начинаем рендеринг');
  
  const rootElement = document.getElementById("root");
  if (rootElement) {
    console.log('🔬 ТЕСТ: Root найден');
    const root = createRoot(rootElement);
    root.render(<TestApp />);
    console.log('🔬 ТЕСТ: ✅ Рендеринг завершён!');
  } else {
    console.error('🔬 ТЕСТ: ❌ Root не найден');
  }
}

// Запуск
setTimeout(render, 100);

console.log('🔬 ТЕСТ: Скрипт завершён');
