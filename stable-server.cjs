/**
 * Stable integrated server for UniFarm
 * Serves both backend API and static frontend files
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('Запуск UniFarm интегрированного сервера...');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API маршруты (пока заглушки)
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

// Статические файлы frontend
const clientPath = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientPath));

// Обслуживание React приложения
app.get('*', (req, res) => {
  const indexPath = path.join(clientPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send(`
        <html>
          <head>
            <title>UniFarm</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .container { max-width: 600px; margin: 0 auto; }
              .status { color: #28a745; font-size: 24px; margin-bottom: 20px; }
              .api-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .endpoint { margin: 10px 0; font-family: monospace; background: #e9ecef; padding: 5px; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🚀 UniFarm Server</h1>
              <div class="status">✅ Сервер работает успешно!</div>
              <p>Backend API запущен и готов к работе</p>
              
              <div class="api-info">
                <h3>Доступные API endpoints:</h3>
                <div class="endpoint">GET /api/health - Проверка состояния</div>
                <div class="endpoint">GET /api/user/profile - Профиль пользователя</div>
                <div class="endpoint">GET /api/farming/status - Статус фарминга</div>
                <div class="endpoint">GET /api/missions - Список миссий</div>
              </div>
              
              <p><small>Frontend будет подключен после сборки клиентского приложения</small></p>
            </div>
          </body>
        </html>
      `);
    }
  });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`UniFarm сервер запущен на порту ${PORT}`);
  console.log(`API доступно: http://localhost:${PORT}/api`);
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