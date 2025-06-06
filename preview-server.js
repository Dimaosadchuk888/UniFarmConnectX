#!/usr/bin/env node
/**
 * Simple preview server for UniFarm app
 * Serves static files and provides basic API endpoints
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve client files with proper content types
app.use(express.static(path.join(__dirname, 'client'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.tsx') || path.endsWith('.ts')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));
app.use('/src', express.static(path.join(__dirname, 'client', 'src'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.tsx') || path.endsWith('.ts')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: 'v2',
    environment: 'development'
  });
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

app.get('/api/v2/user-missions', (req, res) => {
  res.json({
    success: true,
    data: []
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

app.get('/api/v2/daily-bonus/status', (req, res) => {
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

app.get('/api/v2/ton-farming/info', (req, res) => {
  res.json({
    success: true,
    data: {
      deposit_amount: 0,
      farming_balance: 0,
      farming_rate: 0,
      is_active: false,
      last_update: null
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
      },
      {
        id: 2,
        name: "Standard Boost", 
        description: "Стандартный пакет с повышенной доходностью",
        price_ton: "5",
        bonus_uni: "75000",
        daily_rate: "1",
        is_active: true
      }
    ]
  });
});

// Handle all other routes - serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

const server = createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('[WebSocket] New connection established');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('[WebSocket] Received message:', data);
      
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: data.timestamp }));
      }
    } catch (error) {
      console.error('[WebSocket] Message processing error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('[WebSocket] Connection closed');
  });
  
  ws.send(JSON.stringify({ type: 'welcome', message: 'WebSocket connection established' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 UniFarm Preview Server running on http://0.0.0.0:${PORT}`);
  console.log(`📱 App available at: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server active`);
});