/**
 * Simple working missions endpoint
 * Returns hardcoded mission data for immediate display
 */

import express from 'express';

const router = express.Router();

// Simple missions endpoint that always works
router.get('/api/v2/missions/active', (req, res) => {
  console.log('[SIMPLE MISSIONS] Запрос активных миссий');
  
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
  
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  
  res.json({
    success: true,
    data: missions,
    message: 'Активные миссии получены'
  });
});

export default router;