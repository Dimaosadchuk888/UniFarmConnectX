import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

console.log('🚀 Запуск UniFarm сервера...');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client')));

// API endpoints
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Все остальные запросы - отправляем index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ UniFarm сервер запущен на http://localhost:${PORT}`);
});