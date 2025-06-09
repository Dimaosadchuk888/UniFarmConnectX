/**
 * Интегрированный сервер UniFarm
 * Запускает backend API и проксирует frontend dev сервер
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('Запуск интегрированного сервера UniFarm...');

// Запускаем frontend dev сервер на порту 5173
console.log('Запуск frontend dev сервера...');
const frontendProcess = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'client'),
  env: {
    ...process.env,
    NODE_ENV: 'development',
    VITE_API_URL: `http://localhost:${PORT}`
  },
  stdio: 'pipe'
});

frontendProcess.stdout.on('data', (data) => {
  console.log(`Frontend: ${data.toString().trim()}`);
});

frontendProcess.stderr.on('data', (data) => {
  console.log(`Frontend Error: ${data.toString().trim()}`);
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS настройки
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// API маршруты
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'UniFarm API работает',
    timestamp: new Date().toISOString(),
    frontend_status: 'running'
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
      uni_balance: 2500.50,
      ton_balance: 1.25,
      level: 3,
      total_farmed: 15750,
      is_premium: false,
      avatar_url: null,
      registration_date: "2024-01-15T10:30:00Z",
      last_activity: new Date().toISOString()
    }
  });
});

app.get('/api/farming/status', (req, res) => {
  res.json({
    success: true,
    data: {
      is_farming: true,
      current_amount: 387.25,
      farming_rate: 12.5,
      time_remaining: 2847,
      farming_type: "uni_farming",
      start_time: "2024-06-09T08:30:00Z",
      end_time: "2024-06-09T12:30:00Z",
      total_sessions_today: 3
    }
  });
});

app.get('/api/missions', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        title: "Ежедневный вход",
        description: "Войти в приложение и получить бонус",
        reward: 150,
        is_completed: true,
        type: "daily",
        progress: 100,
        icon: "login"
      },
      {
        id: 2,
        title: "Начать фарминг UNI",
        description: "Запустить процесс фарминга UNI токенов",
        reward: 300,
        is_completed: false,
        type: "farming",
        progress: 75,
        icon: "farming"
      },
      {
        id: 3,
        title: "Пригласить друга",
        description: "Пригласить 1 друга через реферальную ссылку",
        reward: 500,
        is_completed: false,
        type: "referral",
        progress: 0,
        icon: "users"
      },
      {
        id: 4,
        title: "Подключить TON кошелек",
        description: "Подключить TON Connect кошелек",
        reward: 250,
        is_completed: true,
        type: "wallet",
        progress: 100,
        icon: "wallet"
      }
    ]
  });
});

app.get('/api/referrals', (req, res) => {
  res.json({
    success: true,
    data: {
      total_referrals: 5,
      active_referrals: 3,
      total_earned: 2500,
      referral_link: "https://t.me/UniFarmBot?start=ref_123456789",
      levels: [
        { level: 1, count: 3, commission: 10 },
        { level: 2, count: 2, commission: 5 }
      ]
    }
  });
});

app.get('/api/wallet/balance', (req, res) => {
  res.json({
    success: true,
    data: {
      uni_balance: 2500.50,
      ton_balance: 1.25,
      total_usd_value: 45.75,
      pending_rewards: 125.00
    }
  });
});

// Проксирование на frontend dev сервер
app.use('/', createProxyMiddleware({
  target: 'http://localhost:5173',
  changeOrigin: true,
  ws: true,
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>UniFarm - Frontend Loading</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0; padding: 20px; background: #1a1a2e; color: white;
              min-height: 100vh; display: flex; align-items: center; justify-content: center;
            }
            .container { text-align: center; max-width: 500px; }
            .spinner { width: 50px; height: 50px; border: 3px solid #333;
              border-top: 3px solid #00ff88; border-radius: 50%;
              animation: spin 1s linear infinite; margin: 20px auto;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .status { color: #00ff88; font-size: 24px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚀 UniFarm</h1>
            <div class="spinner"></div>
            <div class="status">Загружается frontend...</div>
            <p>Пожалуйста, подождите. Frontend dev сервер запускается.</p>
            <button onclick="location.reload()">Обновить</button>
          </div>
        </body>
      </html>
    `);
  }
}));

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`UniFarm интегрированный сервер запущен на порту ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
  console.log(`Приложение: http://localhost:${PORT}`);
  console.log('Frontend dev сервер запускается на порту 5173...');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nОстанавливаю серверы...');
  frontendProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nОстанавливаю серверы...');
  frontendProcess.kill('SIGTERM');
  process.exit(0);
});