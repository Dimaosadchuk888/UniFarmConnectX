/**
 * Stable server for UniFarm - Direct Express server
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('Запуск UniFarm сервера...');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'UniFarm API работает',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/user/profile', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 1,
      telegram_id: "123456789",
      first_name: "Тестовый",
      last_name: "Пользователь",
      username: "testuser",
      uni_balance: 1000,
      ton_balance: 0.5,
      level: 1,
      total_farmed: 5000,
      is_premium: false
    }
  });
});

app.get('/api/farming/status', (req, res) => {
  res.json({
    success: true,
    data: {
      is_farming: true,
      current_amount: 150,
      farming_rate: 10,
      time_remaining: 3600,
      farming_type: "uni_farming"
    }
  });
});

app.get('/api/missions', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        title: "Первый вход",
        description: "Войти в приложение",
        reward: 100,
        is_completed: true,
        type: "daily"
      },
      {
        id: 2,
        title: "Начать фарминг",
        description: "Запустить процесс фарминга",
        reward: 200,
        is_completed: false,
        type: "farming"
      }
    ]
  });
});

// Static files
const clientPath = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientPath));

// Serve React app
app.get('*', (req, res) => {
  const indexPath = path.join(clientPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>UniFarm</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container { 
                text-align: center;
                background: rgba(255,255,255,0.1);
                padding: 40px;
                border-radius: 20px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                max-width: 600px;
              }
              .status { 
                color: #00ff88;
                font-size: 28px;
                margin-bottom: 20px;
                font-weight: bold;
              }
              .api-info { 
                background: rgba(255,255,255,0.1);
                padding: 20px;
                border-radius: 12px;
                margin: 20px 0;
                text-align: left;
              }
              .endpoint { 
                margin: 10px 0;
                font-family: 'Monaco', 'Menlo', monospace;
                background: rgba(0,0,0,0.3);
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 14px;
              }
              h1 { margin: 0 0 10px 0; font-size: 32px; }
              h3 { margin: 15px 0 10px 0; color: #fff; }
              .btn {
                display: inline-block;
                background: #00ff88;
                color: #000;
                padding: 12px 24px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: bold;
                margin: 10px;
                transition: all 0.3s ease;
              }
              .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,255,136,0.3); }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🚀 UniFarm</h1>
              <div class="status">✅ Сервер работает!</div>
              <p>Backend API запущен и готов к работе</p>
              
              <div class="api-info">
                <h3>Доступные API endpoints:</h3>
                <div class="endpoint">GET /api/health</div>
                <div class="endpoint">GET /api/user/profile</div>
                <div class="endpoint">GET /api/farming/status</div>
                <div class="endpoint">GET /api/missions</div>
              </div>
              
              <a href="/api/health" class="btn">Тест API</a>
              <a href="/api/user/profile" class="btn">Профиль</a>
            </div>
          </body>
        </html>
      `);
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`UniFarm сервер запущен на порту ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
  console.log(`Приложение: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nОстанавливаю сервер...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nОстанавливаю сервер...');
  process.exit(0);
});