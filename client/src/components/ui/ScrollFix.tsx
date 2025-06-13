import { useEffect } from 'react';

/**
 * T10 SCROLL FIX: Компонент для принудительного применения стилей прокрутки
 * Устраняет проблемы кеширования CSS
 */
export const ScrollFix = () => {
  useEffect(() => {
    // Принудительно применяем стили прокрутки
    const applyScrollStyles = () => {
      const style = document.createElement('style');
      style.id = 'scroll-fix-t10';
      style.innerHTML = `
        /* T10 EMERGENCY SCROLL FIX v4.0 - Cache Buster ${Date.now()} */
        html, body {
          overflow-y: auto !important;
          overflow-x: hidden !important;
          height: auto !important;
          max-height: none !important;
          min-height: 100vh !important;
        }
        
        #root {
          overflow: visible !important;
          height: auto !important;
          max-height: none !important;
        }
        
        main {
          overflow-y: auto !important;
          overflow-x: hidden !important;
          max-height: none !important;
          height: auto !important;
          padding-bottom: 140px !important;
          min-height: calc(100vh - 180px) !important;
        }
        
        /* Принудительная прокрутка для всех контейнеров */
        * {
          max-height: none !important;
        }
        
        div[class*="overflow-hidden"],
        div[class*="h-screen"],
        div[class*="min-h-screen"] {
          overflow: visible !important;
          height: auto !important;
        }
        
        .bg-card, .space-y-4, .container {
          overflow: visible !important;
          max-height: none !important;
        }
        
        /* Убираем все overflow: hidden */
        div[class*="overflow-hidden"] {
          overflow: visible !important;
        }
      `;
      
      // Удаляем старый стиль если есть
      const oldStyle = document.getElementById('scroll-fix-t10');
      if (oldStyle) {
        oldStyle.remove();
      }
      
      // Добавляем новый стиль
      document.head.appendChild(style);
    };

    // Применяем стили немедленно
    applyScrollStyles();
    
    // Применяем стили через небольшую задержку для преодоления кеша
    const timer = setTimeout(applyScrollStyles, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return null;
};

export default ScrollFix;