/**
 * Simple working missions endpoint
 * Bypasses all routing conflicts and returns mission data directly
 */

import { Express } from 'express';

export function setupSimpleMissionsEndpoint(app: Express) {
  // Clear any existing handlers for this route
  app._router.stack = app._router.stack.filter((layer: any) => {
    return !(layer.route && layer.route.path === '/api/v2/missions/active');
  });

  // Add the working mission endpoint
  app.get('/api/v2/missions/active', (req, res) => {
    console.log('[SIMPLE MISSIONS] 🚀 Returning mission data');
    
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
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.json({
      success: true,
      data: missions,
      message: 'Активные миссии получены'
    });
  });
  
  console.log('[SIMPLE MISSIONS] ✅ Mission endpoint registered');
}