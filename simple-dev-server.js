#!/usr/bin/env node
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('client/public'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Basic API endpoints for the app to work
app.get('/api/user/current', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 1,
      guest_id: 'guest_demo',
      balance_uni: '1000',
      balance_ton: '5.5',
      uni_farming_balance: '250',
      uni_farming_rate: '0.5',
      uni_deposit_amount: '500'
    }
  });
});

app.get('/api/v2/users/profile', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 1,
      guest_id: 'guest_demo',
      balance_uni: '1000',
      balance_ton: '5.5',
      uni_farming_balance: '250',
      uni_farming_rate: '0.5',
      uni_deposit_amount: '500'
    }
  });
});

app.get('/api/v2/missions', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        type: 'social',
        title: 'Подписаться на Telegram канал',
        description: 'Подпишитесь на наш официальный Telegram канал',
        reward_uni: '100.000000',
        is_active: true
      },
      {
        id: 2,
        type: 'invite',
        title: 'Пригласить друга',
        description: 'Пригласите друга и получите бонус',
        reward_uni: '200.000000',
        is_active: true
      }
    ]
  });
});

app.get('/api/v2/uni-farming/status', (req, res) => {
  res.json({
    success: true,
    data: {
      isActive: true,
      depositAmount: '500.000000',
      ratePerSecond: '0.000006',
      totalRatePerSecond: '0.000006',
      depositCount: 1,
      totalDepositAmount: '500.000000',
      dailyIncomeUni: '0.5',
      startDate: new Date().toISOString()
    }
  });
});

app.get('/api/ton-boosts', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: "Starter Boost",
        description: "Начальный пакет для изучения TON Farming",
        price_ton: "1",
        bonus_uni: "10000",
        daily_rate: "0.5",
        is_active: true
      }
    ]
  });
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

const server = createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 UniFarm Development Server running on http://0.0.0.0:${PORT}`);
  console.log(`📱 App available at: http://localhost:${PORT}`);
});