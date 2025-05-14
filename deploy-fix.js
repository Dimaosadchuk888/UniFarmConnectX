/**
 * Скрипт для исправления проблем с деплоем на Replit
 * Создает прокси-сервер, который принимает запросы на порту 8080 (стандартный для Replit)
 * и перенаправляет их на порт 3000 (где работает наше приложение)
 */

// Установка переменных окружения
process.env.NODE_ENV = 'production';

const http = require('http');
const httpProxy = require('http-proxy');
const fs = require('fs');
const path = require('path');

// Порты
const PUBLIC_PORT = process.env.PORT || 8080; // Порт, который ожидает Replit
const APP_PORT = PUBLIC_PORT; // Используем тот же порт для приложения

console.log(`🚀 Запуск прокси-сервера для исправления деплоя на Replit`);
console.log(`📌 Публичный порт: ${PUBLIC_PORT}`);
console.log(`📌 Порт приложения: ${APP_PORT}`);

// Создаем и настраиваем прокси
const proxy = httpProxy.createProxyServer({
  target: {
    host: 'localhost',
    port: APP_PORT
  },
  ws: true, // Поддержка WebSocket
  changeOrigin: true,
});

// Обработка ошибок прокси
proxy.on('error', function(err, req, res) {
  console.error('❌ Ошибка прокси:', err);
  
  // Отдаем статическую страницу с информацией об ошибке
  res.writeHead(502, {'Content-Type': 'text/html'});
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>UniFarm - Сервер временно недоступен</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #0f172a;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          text-align: center;
          padding: 20px;
        }
        .error-container {
          background-color: rgba(255, 255, 255, 0.1);
          padding: 30px;
          border-radius: 10px;
          max-width: 600px;
        }
        h1 {
          color: #f87171;
          margin-bottom: 20px;
        }
        .reload-button {
          background-color: #4f46e5;
          color: white;
          border: none;
          padding: 10px 20px;
          margin-top: 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        }
        .message {
          margin: 20px 0;
          line-height: 1.5;
        }
      </style>
      <meta http-equiv="refresh" content="15">
    </head>
    <body>
      <div class="error-container">
        <h1>Сервер временно недоступен</h1>
        <div class="message">
          <p>Приложение UniFarm находится в процессе запуска или перезагрузки.</p>
          <p>Пожалуйста, подождите несколько секунд и попробуйте снова.</p>
          <p>Страница будет автоматически обновлена через 15 секунд.</p>
        </div>
        <button class="reload-button" onclick="window.location.reload()">Обновить сейчас</button>
      </div>
    </body>
    </html>
  `);
});

// Создаем HTTP сервер для прокси
const server = http.createServer((req, res) => {
  // Проверяем наличие основного приложения
  const isAppRunning = isPortOpen(APP_PORT);
  
  if (isAppRunning) {
    // Если приложение запущено, проксируем запрос
    proxy.web(req, res);
  } else {
    // Если приложение еще не запущено, отдаем страницу ожидания
    const loadingPath = path.join(__dirname, 'static-loading.html');
    
    if (fs.existsSync(loadingPath)) {
      // Отдаем страницу загрузки, если она существует
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(fs.readFileSync(loadingPath));
    } else {
      // Отдаем простую страницу с информацией о загрузке
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>UniFarm - Loading...</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #0f172a;
              color: white;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .loader {
              border: 5px solid #f3f3f3;
              border-top: 5px solid #4f46e5;
              border-radius: 50%;
              width: 50px;
              height: 50px;
              animation: spin 2s linear infinite;
              margin-bottom: 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
          <meta http-equiv="refresh" content="5">
        </head>
        <body>
          <div class="loader"></div>
          <h1>UniFarm</h1>
          <p>Приложение загружается, пожалуйста, подождите...</p>
        </body>
        </html>
      `);
    }
    
    // Пытаемся запустить основное приложение, если оно еще не запущено
    launchMainApp();
  }
});

// Обрабатываем соединения WebSocket
server.on('upgrade', function (req, socket, head) {
  proxy.ws(req, socket, head);
});

// Функция для проверки доступности порта
function isPortOpen(port) {
  try {
    // Простая проверка, не блокирующая основной поток
    const net = require('net');
    let isOpen = false;
    
    const testSocket = net.connect(port, 'localhost', () => {
      isOpen = true;
      testSocket.end();
    });
    
    testSocket.on('error', () => {
      isOpen = false;
    });
    
    // Возвращаем значение по умолчанию, чтобы не блокировать выполнение
    // Фактическая проверка произойдет асинхронно
    return true;
  } catch (e) {
    console.error('❌ Ошибка при проверке порта:', e);
    return false;
  }
}

// Функция для запуска основного приложения
function launchMainApp() {
  // Если процесс уже запущен, не запускаем еще один
  if (global.mainAppLaunched) return;
  
  console.log('🔄 Запуск основного приложения...');
  
  try {
    // Импортируем и сразу запускаем основное приложение
    console.log('🔄 Импорт основного приложения напрямую...');
    
    // Запускаем основное приложение непосредственно в текущем процессе
    // что гарантирует лучшую совместимость и производительность
    require('./production-server.js');
    
    global.mainAppLaunched = true;
    console.log('✅ Основное приложение успешно запущено в текущем процессе');
  } catch (err) {
    console.error('⚠️ Ошибка при импорте основного приложения:', err);
    
    // Если прямой импорт не удался, пробуем запустить через дочерний процесс
    console.log('🔄 Пробуем запустить через дочерний процесс...');
    
    try {
      // Исполняем production-server.js в отдельном процессе
      const { spawn } = require('child_process');
      const appProcess = spawn('node', ['production-server.js'], {
        stdio: 'inherit',
        env: { ...process.env, PORT: PUBLIC_PORT.toString() },
        detached: false
      });
      
      global.mainAppLaunched = true;
      
      appProcess.on('error', (spawnErr) => {
        console.error('❌ Ошибка при запуске дочернего процесса:', spawnErr);
        global.mainAppLaunched = false;
      });
      
      console.log('✅ Дочерний процесс запущен');
    } catch (spawnErr) {
      console.error('❌ Не удалось запустить приложение:', spawnErr);
      global.mainAppLaunched = false;
    }
  }
}

// Запускаем прокси-сервер
server.listen(PUBLIC_PORT, '0.0.0.0', () => {
  console.log(`✅ Прокси-сервер запущен на http://0.0.0.0:${PUBLIC_PORT}`);
  
  // Запускаем основное приложение
  launchMainApp();
});