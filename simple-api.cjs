const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/v2/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// User profile
app.get('/api/v2/users/profile', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 1,
      username: 'demo_user',
      balance: 12450,
      farming_active: true,
      farming_rate: 0.5,
      level: 3,
      energy: 85,
      max_energy: 100
    }
  });
});

// Daily bonus status
app.get('/api/v2/daily-bonus/status', (req, res) => {
  res.json({
    success: true,
    data: {
      available: true,
      day: 1,
      reward: 100,
      next_bonus_in: 3600000
    }
  });
});

// Farming endpoints
app.post('/api/v2/farming/start', (req, res) => {
  res.json({
    success: true,
    data: {
      farming_active: true,
      started_at: Date.now(),
      rate: 0.5
    }
  });
});

app.post('/api/v2/farming/claim', (req, res) => {
  res.json({
    success: true,
    data: {
      claimed_amount: 250,
      new_balance: 12700
    }
  });
});

// Missions
app.get('/api/v2/missions', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        title: 'Пригласить друга',
        description: 'Пригласи друга и получи бонус',
        reward: 500,
        completed: false,
        type: 'referral'
      },
      {
        id: 2,
        title: 'Ежедневный вход',
        description: 'Заходи каждый день',
        reward: 100,
        completed: true,
        type: 'daily'
      }
    ]
  });
});

// Referral system
app.get('/api/v2/referrals', (req, res) => {
  res.json({
    success: true,
    data: {
      referral_code: 'USER123',
      referrals_count: 3,
      total_earned: 1500,
      referrals: [
        { username: 'friend1', earned: 500 },
        { username: 'friend2', earned: 600 },
        { username: 'friend3', earned: 400 }
      ]
    }
  });
});

// Wallet
app.get('/api/v2/wallet/transactions', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        type: 'farming',
        amount: 250,
        timestamp: Date.now() - 3600000,
        status: 'completed'
      },
      {
        id: 2,
        type: 'referral',
        amount: 500,
        timestamp: Date.now() - 7200000,
        status: 'completed'
      }
    ]
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API сервер запущен на порту ${PORT}`);
});