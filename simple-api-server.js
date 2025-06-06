#!/usr/bin/env node
/**
 * Упрощенный API сервер для UniFarm
 * Работает без базы данных с демо-данными
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API v2 endpoints
const apiPrefix = '/api/v2';

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString()
  });
});

// User Profile API
app.get(`${apiPrefix}/users/profile`, (req, res) => {
  res.json({
    success: true,
    data: {
      id: 1,
      guest_id: 'guest_demo_' + Date.now(),
      balance_uni: '1000.000000',
      balance_ton: '5.500000',
      uni_farming_balance: '250.000000',
      uni_farming_rate: '0.500000',
      uni_deposit_amount: '500.000000',
      uni_farming_start_timestamp: new Date().toISOString(),
      uni_farming_last_update: new Date().toISOString(),
      uni_farming_active: true
    }
  });
});

// Daily bonus status API
app.get(`${apiPrefix}/daily-bonus/status`, (req, res) => {
  res.json({
    success: true,
    data: {
      can_claim: true,
      streak: 1,
      last_claim_date: null,
      next_claim_time: null,
      bonus_amount: 100
    }
  });
});

// TON Farming info API
app.get(`${apiPrefix}/ton-farming/info`, (req, res) => {
  res.json({
    success: true,
    data: {
      deposit_amount: 2.5,
      farming_balance: 0.15,
      farming_rate: 0.0001,
      is_active: true,
      last_update: new Date().toISOString()
    }
  });
});

// UNI Farming status API
app.get(`${apiPrefix}/uni-farming/status`, (req, res) => {
  res.json({
    success: true,
    data: {
      isActive: true,
      depositAmount: '500.000000',
      ratePerSecond: '0.000006',
      totalRatePerSecond: '0.000006',
      depositCount: 1,
      totalDepositAmount: '500.000000'
    }
  });
});

// Wallet balance API
app.get(`${apiPrefix}/wallet/balance`, (req, res) => {
  res.json({
    success: true,
    data: {
      balance_uni: '1000.000000',
      balance_ton: '5.500000',
      uni_farming_balance: '250.000000',
      accumulated_ton: '0.150000'
    }
  });
});

// Missions API
app.get(`${apiPrefix}/missions`, (req, res) => {
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

// User missions API
app.get(`${apiPrefix}/user-missions`, (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

// Legacy API support
app.get('/api/user/current', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 1,
      guest_id: 'guest_' + Date.now(),
      balance_uni: '1000',
      balance_ton: '5.5',
      uni_farming_balance: '250',
      uni_farming_rate: '0.5',
      uni_deposit_amount: '500'
    }
  });
});

// Serve static files from client/dist if in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 UniFarm API сервер запущен на порту ${port}`);
  console.log(`📡 API доступен на http://localhost:${port}/api/v2`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
});

module.exports = app;