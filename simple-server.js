import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerCleanRoutes } from './server/routes-clean.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Базовые middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS для всех источников
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
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'UniFarm сервер работает'
  });
});

// Добавляем middleware для Telegram данных
app.use((req, res, next) => {
  // Базовая структура для req.telegram
  req.telegram = {
    user: null,
    validated: false
  };
  next();
});

// Регистрируем API маршруты
registerCleanRoutes(app);

// Обслуживание React фронтенда
app.use(express.static(path.join(__dirname, 'client', 'src')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// SPA маршрутизация - все остальные маршруты ведут к index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
  }
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 [SYSTEM] UniFarm сервер запущен`);
  console.log(`[INFO] 🚀 Сервер работает на порту ${PORT}`);
  console.log(`[INFO] 📱 Mini App URL: https://uni-farm-connect-xo-osadchukdmitro2.replit.app`);
  console.log(`[INFO] 🔗 Health check: http://localhost:${PORT}/health`);
});

// Логирование всех запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Детальное логирование ошибок
app.use((error, req, res, next) => {
  console.error('Express ошибка:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      timestamp: new Date().toISOString()
    });
  }
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
  console.error('Критическая ошибка:', error.message, error.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('Необработанное отклонение:', reason);
});