/**
 * T10 SCROLL FIX: Утилиты для принудительного применения прокрутки
 * Применяются на уровне utils для максимальной надежности
 */

let isScrollFixApplied = false;

export const applyScrollFix = () => {
  if (isScrollFixApplied) return;
  
  // Принудительно применяем стили через JavaScript
  const applyStyles = () => {
    // HTML и Body
    document.documentElement.style.overflowY = 'auto';
    document.documentElement.style.overflowX = 'hidden';
    document.documentElement.style.height = 'auto';
    document.documentElement.style.maxHeight = 'none';
    document.documentElement.style.minHeight = '100vh';
    
    document.body.style.overflowY = 'auto';
    document.body.style.overflowX = 'hidden';
    document.body.style.height = 'auto';
    document.body.style.maxHeight = 'none';
    document.body.style.minHeight = '100vh';
    
    // Root элемент
    const root = document.getElementById('root');
    if (root) {
      root.style.overflow = 'visible';
      root.style.height = 'auto';
      root.style.maxHeight = 'none';
      root.style.minHeight = '100vh';
    }
    
    // Main элементы
    const mainElements = document.querySelectorAll('main');
    mainElements.forEach(main => {
      main.style.overflowY = 'auto';
      main.style.overflowX = 'hidden';
      main.style.maxHeight = 'none';
      main.style.height = 'auto';
      main.style.paddingBottom = '180px';
      main.style.minHeight = 'calc(100vh - 220px)';
    });
    
    // Убираем overflow: hidden везде
    const elementsWithOverflowHidden = document.querySelectorAll('*');
    elementsWithOverflowHidden.forEach(el => {
      const element = el as HTMLElement;
      const computedStyle = window.getComputedStyle(element);
      if (computedStyle.overflow === 'hidden' || computedStyle.overflowY === 'hidden') {
        element.style.overflow = 'visible';
        element.style.overflowY = 'auto';
        element.style.maxHeight = 'none';
      }
    });
  };
  
  // Применяем немедленно
  applyStyles();
  
  // Применяем после загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyStyles);
  }
  
  // Применяем через интервалы
  setTimeout(applyStyles, 100);
  setTimeout(applyStyles, 300);
  setTimeout(applyStyles, 500);
  setTimeout(applyStyles, 1000);
  
  // Постоянное применение
  setInterval(applyStyles, 3000);
  
  isScrollFixApplied = true;
};

// Автоматически применяем при импорте
if (typeof window !== 'undefined') {
  applyScrollFix();
}