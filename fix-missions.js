/**
 * Emergency fix for mission cards display
 * Creates a simple working server that returns mission data
 */

const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: '*'
}));

app.use(express.json());

// Clear mission endpoint
app.get('/api/v2/missions/active', (req, res) => {
  console.log('🚀 Returning mission data for cards');
  
  const missions = [
    {
      id: 1,
      title: "Ежедневный вход",
      description: "Заходите в приложение каждый день",
      reward: "100 UNI",
      status: "active",
      type: "daily",
      progress: 0,
      maxProgress: 1,
      is_active: true,
      link: null
    },
    {
      id: 2,
      title: "Пригласить друга", 
      description: "Пригласите друга в UniFarm",
      reward: "500 UNI",
      status: "active",
      type: "referral",
      progress: 0,
      maxProgress: 1,
      is_active: true,
      link: null
    },
    {
      id: 3,
      title: "TON Boost",
      description: "Активируйте TON Boost для увеличения дохода",
      reward: "1000 UNI",
      status: "active",
      type: "boost",
      progress: 0,
      maxProgress: 1,
      is_active: true,
      link: null
    }
  ];
  
  res.status(200).json({
    success: true,
    data: missions,
    message: 'Активные миссии получены'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const port = 3001;
app.listen(port, () => {
  console.log(`✅ Mission server running on port ${port}`);
});