/**
 * Простой API сервер для отображения реальных данных кабинета
 */

import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Подключение к PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

app.use(cors());
app.use(express.json());

// Статичные файлы
app.use(express.static(path.join(__dirname, 'dist')));

// API для получения данных пользователя
app.get('/api/me', async (req, res) => {
  try {
    const guestId = req.headers['x-guest-id'] || req.query.guest_id || 'dev-replit-1748680222';
    
    const userResult = await pool.query(
      'SELECT * FROM users WHERE guest_id = $1',
      [guestId]
    );
    
    if (userResult.rows.length === 0) {
      return res.json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        guestId: user.guest_id,
        uniBalance: parseFloat(user.uni_balance),
        tonBalance: parseFloat(user.ton_balance),
        refCode: user.ref_code
      }
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.json({
      success: false,
      error: 'Database error'
    });
  }
});

// API для получения информации о фарминге
app.get('/api/v2/uni-farming/status', async (req, res) => {
  try {
    const userId = req.query.user_id || 1;
    
    const farmingResult = await pool.query(
      'SELECT * FROM farming_deposits WHERE user_id = $1',
      [userId]
    );
    
    if (farmingResult.rows.length === 0) {
      return res.json({
        success: false,
        error: 'No farming deposits found'
      });
    }
    
    const farming = farmingResult.rows[0];
    
    res.json({
      success: true,
      data: {
        isActive: true,
        amount: parseFloat(farming.amount),
        hourlyRate: parseFloat(farming.hourly_rate),
        boostActive: farming.boost_active,
        startTime: farming.start_time
      }
    });
    
  } catch (error) {
    console.error('Farming error:', error);
    res.json({
      success: false,
      error: 'Database error'
    });
  }
});

// API для получения миссий
app.get('/api/v2/missions/active', async (req, res) => {
  try {
    const missionsResult = await pool.query(
      'SELECT * FROM missions WHERE is_active = true'
    );
    
    res.json({
      success: true,
      data: missionsResult.rows.map(mission => ({
        id: mission.id,
        title: mission.title,
        description: mission.description,
        reward: parseFloat(mission.reward),
        type: mission.mission_type
      }))
    });
    
  } catch (error) {
    console.error('Missions error:', error);
    res.json({
      success: false,
      error: 'Database error'
    });
  }
});

// Обслуживание frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Simple API Server running on port ${port}`);
  console.log(`📊 Database connected for real cabinet data`);
});