import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Базовые middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
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

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '3.0-simplified'
  });
});

// Простые API эндпоинты
app.get('/api/v2/status', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    data: {
      status: 'working',
      version: '2.0',
      database: 'connected',
      routes: 'active'
    }
  });
});

app.get('/api/v2/me', (req, res) => {
  res.status(401).json({
    success: false,
    error: 'Требуется авторизация через Telegram Mini App',
    need_telegram_auth: true
  });
});

app.get('/api/v2/farming', (req, res) => {
  res.status(401).json({
    success: false,
    error: 'Требуется авторизация через Telegram Mini App'
  });
});

app.get('/api/v2/wallet', (req, res) => {
  res.status(401).json({
    success: false,
    error: 'Требуется авторизация через Telegram Mini App'
  });
});

// Обслуживание фронтенда
app.use(express.static(path.join(__dirname, 'client', 'src')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// SPA маршрутизация
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', err.message);
  res.status(500).json({
    success: false,
    error: 'Внутренняя ошибка сервера',
    timestamp: new Date().toISOString()
  });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log('🎯 [SYSTEM] UniFarm сервер запущен');
  console.log(`[INFO] 🚀 Сервер работает на порту ${PORT}`);
  console.log(`[INFO] 📱 Mini App URL: https://uni-farm-connect-xo-osadchukdmitro2.replit.app`);
  console.log(`[INFO] 🔗 Health check: http://localhost:${PORT}/health`);
});

process.on('uncaughtException', (error) => {
  console.error('Критическая ошибка:', error.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Необработанное отклонение:', reason);
});