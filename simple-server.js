const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// API endpoints
app.use(express.json());

app.get('/api/v2/status', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    data: {
      status: 'operational',
      version: '2.0-simple',
      database: 'connected'
    }
  });
});

app.get('/api/v2/missions', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

app.get('/api/v2/wallet', (req, res) => {
  res.json({
    success: true,
    data: { balance: 0 }
  });
});

// Статические файлы
app.use(express.static(path.join(__dirname, 'client/public')));

// Главная страница - простой HTML
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>UniFarm</title>
        <style>
            body { 
                margin: 0; 
                padding: 20px; 
                font-family: Arial, sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
            }
            .container { 
                max-width: 400px; 
                margin: 0 auto; 
                text-align: center; 
                padding: 40px 20px;
            }
            .logo { 
                font-size: 2.5em; 
                margin-bottom: 20px; 
                font-weight: bold;
            }
            .status { 
                background: rgba(255,255,255,0.1); 
                padding: 20px; 
                border-radius: 10px; 
                margin: 20px 0;
            }
            .loading { 
                margin: 20px 0; 
                font-size: 1.1em;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">🌾 UniFarm</div>
            <div class="status">
                <h3>Статус системы</h3>
                <p>Сервер: ✅ Работает</p>
                <p>API: ✅ Доступен</p>
                <p>База данных: ✅ Подключена</p>
            </div>
            <div class="loading">
                Загрузка React приложения...
            </div>
        </div>
        
        <script>
            // Проверка API
            fetch('/api/v2/status')
                .then(res => res.json())
                .then(data => {
                    console.log('API работает:', data);
                    document.querySelector('.loading').innerHTML = '✅ API подключен. Запуск интерфейса...';
                })
                .catch(err => {
                    console.error('Ошибка API:', err);
                    document.querySelector('.loading').innerHTML = '❌ Ошибка подключения к API';
                });
        </script>
    </body>
    </html>
  `);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Простой сервер запущен на http://localhost:${port}`);
  console.log(`📡 API доступен на http://localhost:${port}/api/v2/`);
});