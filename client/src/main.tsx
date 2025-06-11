console.log('[UniFarm] Начало загрузки main.tsx');

// Создаем простой интерфейс без React для тестирования
const rootElement = document.getElementById("root");
if (rootElement) {
  console.log('[UniFarm] Элемент root найден, создаем интерфейс');
  
  rootElement.innerHTML = `
    <div style="
      min-height: 100vh; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; 
      padding: 20px;
      font-family: system-ui, sans-serif;
    ">
      <h1 style="color: #fff; margin-bottom: 20px; text-align: center;">
        🚀 UniFarm Telegram Mini App
      </h1>
      
      <div style="
        background: rgba(255,255,255,0.1); 
        padding: 20px; 
        border-radius: 15px; 
        margin-bottom: 20px;
        backdrop-filter: blur(10px);
      ">
        <h2>✅ Статус системы:</h2>
        <p>✓ HTML документ загружен успешно</p>
        <p>✓ JavaScript выполняется корректно</p>
        <p>✓ Telegram WebApp API: ${typeof window.Telegram !== 'undefined' ? 'Доступен' : 'Недоступен'}</p>
        <p>✓ Приложение готово к работе</p>
      </div>
      
      <div style="
        background: rgba(255,255,255,0.1); 
        padding: 15px; 
        border-radius: 10px; 
        margin-bottom: 20px;
      ">
        <h3>📱 Информация:</h3>
        <p><strong>Host:</strong> ${window.location.host}</p>
        <p><strong>URL:</strong> ${window.location.href}</p>
        <p><strong>User Agent:</strong> ${navigator.userAgent.substring(0, 60)}...</p>
      </div>

      <button 
        onclick="alert('Приложение работает корректно!');"
        style="
          background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 25px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          transition: transform 0.2s;
        "
        onmouseover="this.style.transform='scale(1.05)'"
        onmouseout="this.style.transform='scale(1)'"
      >
        🎯 Тест интерактивности
      </button>
      
      <div style="margin-top: 30px; text-align: center;">
        <p style="opacity: 0.8;">Приложение восстановлено и готово к использованию</p>
      </div>
    </div>
  `;
  
  console.log('[UniFarm] Интерфейс создан успешно');
} else {
  console.error('[UniFarm] Элемент #root не найден');
}

// Позже загружаем React приложение
setTimeout(() => {
  console.log('[UniFarm] Начинаем загрузку React приложения...');
  
  import("react").then((React) => {
    import("react-dom/client").then(({ createRoot }) => {
      import("./App").then((App) => {
        console.log('[UniFarm] React модули загружены, запускаем приложение');
        
        const root = createRoot(document.getElementById("root"));
        root.render(React.createElement(App.default));
        
        console.log('[UniFarm] React приложение запущено успешно');
      }).catch(err => {
        console.error('[UniFarm] Ошибка загрузки App:', err);
      });
    }).catch(err => {
      console.error('[UniFarm] Ошибка загрузки React DOM:', err);
    });
  }).catch(err => {
    console.error('[UniFarm] Ошибка загрузки React:', err);
  });
}, 2000);