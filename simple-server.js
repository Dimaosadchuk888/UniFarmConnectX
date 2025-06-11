const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS для всех запросов
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Статические файлы из client
app.use(express.static(path.join(__dirname, 'client')));
app.use('/assets', express.static(path.join(__dirname, 'attached_assets')));

// API endpoints - простые заглушки для демонстрации
app.get('/api/v2/users/profile', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 1,
      username: 'demo_user',
      balance: 1250.75,
      mining_power: 100
    }
  });
});

app.get('/api/v2/farming/status', (req, res) => {
  res.json({
    success: true,
    data: {
      isActive: true,
      currentReward: 45.25,
      totalReward: 1250.75
    }
  });
});

// Все остальные запросы отправляем на index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`UniFarm сервер запущен на порту ${PORT}`);
  console.log(`Откройте http://localhost:${PORT} для просмотра приложения`);
});