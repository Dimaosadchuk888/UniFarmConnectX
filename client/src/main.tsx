// МИНИМАЛЬНЫЙ ТЕСТ REACT - ТОЛЬКО ДЛЯ ДИАГНОСТИКИ
import { createRoot } from "react-dom/client";

console.log('🔬 ТЕСТ 1: JavaScript загружается!');
console.log('🔬 ТЕСТ 2: Время загрузки:', new Date().toISOString());

try {
  console.log('🔬 ТЕСТ 3: Ищем элемент root...');
  const rootElement = document.getElementById("root");
  
  if (rootElement) {
    console.log('🔬 ТЕСТ 4: Элемент root найден!', rootElement);
    
    console.log('🔬 ТЕСТ 5: Создаём React root...');
    const root = createRoot(rootElement);
    
    console.log('🔬 ТЕСТ 6: Рендерим тестовый компонент...');
    root.render(<div style={{
      color: 'white', 
      background: 'red', 
      padding: '20px', 
      fontSize: '24px',
      textAlign: 'center'
    }}>
      🎯 REACT ТЕСТ РАБОТАЕТ! 
      <br/>
      Время: {new Date().toLocaleTimeString()}
    </div>);
    
    console.log('🔬 ТЕСТ 7: ✅ React успешно отрендерен!');
    
    // Дополнительная проверка через DOM
    setTimeout(() => {
      console.log('🔬 ТЕСТ 8: Проверяем содержимое DOM:', rootElement.innerHTML);
    }, 100);
    
  } else {
    console.error('🔬 ТЕСТ ОШИБКА: Элемент #root НЕ найден!');
    console.log('🔬 ДИАГНОСТИКА: Все элементы на странице:', document.querySelectorAll('*'));
  }
} catch (error) {
  console.error('🔬 ТЕСТ КРИТИЧЕСКАЯ ОШИБКА:', error);
  console.error('🔬 СТЕК ОШИБКИ:', error.stack);
}
