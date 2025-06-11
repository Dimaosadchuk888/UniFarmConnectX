import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client')));
app.use('/assets', express.static(path.join(__dirname, 'attached_assets')));

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

// API endpoints for UniFarm
app.get('/api/v2/users/profile', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 1,
      username: 'demo_user',
      balance: 1250.75,
      mining_power: 100,
      referrals: 12,
      missions_completed: 7
    }
  });
});

app.get('/api/v2/farming/status', (req, res) => {
  res.json({
    success: true,
    data: {
      isActive: true,
      currentReward: 45.25,
      totalReward: 1250.75,
      farmingTime: "24h"
    }
  });
});

app.get('/api/v2/missions/list', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        title: "Пригласить друга",
        description: "Получите +50 UNI за каждого приглашенного",
        reward: 50,
        status: "active"
      },
      {
        id: 2,
        title: "Ежедневный вход",
        description: "Заходите в приложение каждый день",
        reward: 10,
        status: "active"
      }
    ]
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'UniFarm'
  });
});

// TON Connect manifest
app.get('/tonconnect-manifest.json', (req, res) => {
  res.json({
    url: process.env.REPLIT_DEPLOYMENT_URL || `http://localhost:${PORT}`,
    name: "UniFarm",
    iconUrl: `${process.env.REPLIT_DEPLOYMENT_URL || `http://localhost:${PORT}`}/assets/icon.png`,
    termsOfUseUrl: `${process.env.REPLIT_DEPLOYMENT_URL || `http://localhost:${PORT}`}/terms`,
    privacyPolicyUrl: `${process.env.REPLIT_DEPLOYMENT_URL || `http://localhost:${PORT}`}/privacy`
  });
});

// Все остальные запросы -> index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`UniFarm сервер запущен на порту ${PORT}`);
  console.log(`Доступен по адресу: http://localhost:${PORT}`);
});