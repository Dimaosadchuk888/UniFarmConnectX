import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
let db;
try {
  if (process.env.DATABASE_URL) {
    db = neon(process.env.DATABASE_URL);
    console.log('✅ Database connected successfully');
  } else {
    console.warn('⚠️ No DATABASE_URL found');
  }
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', async (req, res) => {
  try {
    let dbStatus = 'disconnected';
    if (db) {
      await db`SELECT 1`;
      dbStatus = 'connected';
    }
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      telegram: process.env.TELEGRAM_BOT_TOKEN ? 'configured' : 'not_configured',
      version: '3.0-production'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.get('/api/v2/status', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    data: {
      status: 'operational',
      version: '2.0',
      database: db ? 'connected' : 'disconnected',
      routes: 'active'
    }
  });
});

// User authentication endpoint
app.get('/api/v2/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Требуется авторизация через Telegram Mini App',
        need_telegram_auth: true
      });
    }

    // For now, return mock user data until proper Telegram integration
    res.json({
      success: true,
      data: {
        id: 'guest',
        username: 'guest_user',
        telegram_id: null,
        balance: 0,
        farming_active: false
      }
    });
  } catch (error) {
    console.error('Error in /api/v2/me:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      timestamp: new Date().toISOString()
    });
  }
});

// Farming endpoints
app.get('/api/v2/farming', (req, res) => {
  res.json({
    success: true,
    data: {
      active: false,
      rate: 0,
      accumulated: 0,
      last_claim: null
    }
  });
});

app.post('/api/v2/farming/start', (req, res) => {
  res.json({
    success: true,
    message: 'Фарминг запущен',
    data: {
      active: true,
      rate: 0.1,
      started_at: new Date().toISOString()
    }
  });
});

app.post('/api/v2/farming/claim', (req, res) => {
  res.json({
    success: true,
    message: 'Награда получена',
    data: {
      claimed_amount: 0,
      new_balance: 0
    }
  });
});

// Wallet endpoints
app.get('/api/v2/wallet', (req, res) => {
  res.json({
    success: true,
    data: {
      balance: 0,
      currency: 'UNIFARM',
      transactions: []
    }
  });
});

// Static files - проверяем существование
const distPath = path.join(__dirname, 'client', 'dist');
const publicPath = path.join(__dirname, 'client', 'public');

// Обслуживаем статические файлы из dist если существует, иначе из public
try {
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
  } else if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }
} catch (error) {
  console.warn('Статические файлы не найдены');
}

// SPA routing с проверкой файлов
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(__dirname, 'client', 'dist', 'index.html');
    const publicIndexPath = path.join(__dirname, 'client', 'public', 'index.html');
    const fallbackIndexPath = path.join(__dirname, 'client', 'index.html');
    
    // Пробуем найти index.html в разных локациях
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else if (fs.existsSync(publicIndexPath)) {
      res.sendFile(publicIndexPath);
    } else if (fs.existsSync(fallbackIndexPath)) {
      res.sendFile(fallbackIndexPath);
    } else {
      // Возвращаем простую HTML страницу если файлы не найдены
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>UniFarm Loading</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h1>🌾 UniFarm</h1>
            <p>Приложение загружается...</p>
            <p><a href="/health">Проверить статус сервера</a></p>
          </div>
        </body>
        </html>
      `);
    }
  } else {
    res.status(404).json({
      success: false,
      error: 'Эндпоинт не найден'
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    success: false,
    error: 'Внутренняя ошибка сервера',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🎯 UniFarm Production Server Started');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Mini App URL: https://uni-farm-connect-xo-osadchukdmitro2.replit.app`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🗄️ Database: ${db ? 'Connected' : 'Not connected'}`);
});

// Process handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});