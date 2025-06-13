import { useEffect } from 'react';

/**
 * T10 FORCE SCROLL: Агрессивное принудительное применение прокрутки
 * Обходит все возможные проблемы с кешированием CSS
 */
export const ForceScroll = () => {
  useEffect(() => {
    // Функция для принудительного применения стилей прокрутки
    const forceScrollStyles = () => {
      // Создаем стиль с максимальным приоритетом
      const forceStyle = document.createElement('style');
      forceStyle.id = 'force-scroll-override';
      forceStyle.innerHTML = `
        /* T10 FORCE SCROLL - Cache Buster ${Date.now()} */
        /* CRITICAL: Максимальный приоритет для всех стилей */
        
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
          padding-bottom: 160px !important;
          min-height: calc(100vh - 200px) !important;
        }
        
        div[class*="overflow-hidden"],
        div[class*="h-screen"],
        div[class*="min-h-screen"],
        .bg-card,
        .space-y-4,
        .space-y-5,
        .space-y-6,
        .container {
          overflow: visible !important;
          max-height: none !important;
          height: auto !important;
        }
        
        /* Принудительная прокрутка для всех элементов */
        * {
          max-height: none !important;
        }
      `;
      
      // Удаляем старый стиль
      const oldStyle = document.getElementById('force-scroll-override');
      if (oldStyle) {
        oldStyle.remove();
      }
      
      // Добавляем новый стиль в head
      document.head.appendChild(forceStyle);
      
      // Принудительно применяем стили через DOM
      const applyDirectStyles = () => {
        // Для body и html
        document.documentElement.style.overflowY = 'auto';
        document.documentElement.style.overflowX = 'hidden';
        document.documentElement.style.height = 'auto';
        document.documentElement.style.maxHeight = 'none';
        
        document.body.style.overflowY = 'auto';
        document.body.style.overflowX = 'hidden';
        document.body.style.height = 'auto';
        document.body.style.maxHeight = 'none';
        
        // Для root элемента
        const root = document.getElementById('root');
        if (root) {
          root.style.overflow = 'visible';
          root.style.height = 'auto';
          root.style.maxHeight = 'none';
        }
        
        // Для main элементов
        const mainElements = document.querySelectorAll('main');
        mainElements.forEach(main => {
          main.style.overflowY = 'auto';
          main.style.overflowX = 'hidden';
          main.style.maxHeight = 'none';
          main.style.height = 'auto';
          main.style.paddingBottom = '160px';
          main.style.minHeight = 'calc(100vh - 200px)';
        });
        
        // Убираем overflow: hidden у всех элементов
        const hiddenElements = document.querySelectorAll('[class*="overflow-hidden"]');
        hiddenElements.forEach(el => {
          (el as HTMLElement).style.overflow = 'visible';
          (el as HTMLElement).style.maxHeight = 'none';
        });
      };
      
      // Применяем стили немедленно и многократно
      applyDirectStyles();
      
      // Применяем через различные задержки для гарантии
      setTimeout(applyDirectStyles, 50);
      setTimeout(applyDirectStyles, 100);
      setTimeout(applyDirectStyles, 200);
      setTimeout(applyDirectStyles, 500);
      setTimeout(applyDirectStyles, 1000);
      setTimeout(applyDirectStyles, 2000);
    };

    // Запускаем принудительное применение
    forceScrollStyles();
    
    // Создаем observer для мониторинга изменений DOM
    const observer = new MutationObserver(() => {
      forceScrollStyles();
    });
    
    // Наблюдаем за изменениями в body
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    // Повторяем применение каждую секунду для гарантии
    const interval = setInterval(forceScrollStyles, 1000);
    
    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return null;
};

export default ForceScroll;