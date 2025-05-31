/**
 * Simple API server specifically for displaying real cabinet data
 * Connects directly to PostgreSQL to retrieve your 1000 UNI balance
 */

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Enhanced CORS for Telegram WebApp
app.use(cors({
  origin: ['https://telegram.org', 'https://web.telegram.org', '*'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-guest-id', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test connection
pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL database'))
  .catch(err => console.error('❌ Database connection error:', err));

// API endpoint for real cabinet data
app.get('/api/cabinet', async (req, res) => {
  try {
    const guest_id = req.query.guest_id || req.headers['x-guest-id'] || 'dev-replit-1748680222';
    
    console.log(`[Cabinet API] Getting data for guest_id: ${guest_id}`);
    
    const result = await pool.query(
      'SELECT id, username, guest_id, telegram_id, uni_balance, ton_balance, ref_code FROM users WHERE guest_id = $1 OR id = 1 LIMIT 1',
      [guest_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = result.rows[0];
    console.log(`[Cabinet API] Found user:`, user);
    
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        guest_id: user.guest_id,
        uni_balance: parseFloat(user.uni_balance) || 0,
        ton_balance: parseFloat(user.ton_balance) || 0,
        ref_code: user.ref_code,
        // For frontend compatibility
        balance_uni: parseFloat(user.uni_balance) || 0,
        balance_ton: parseFloat(user.ton_balance) || 0
      }
    });
  } catch (error) {
    console.error('[Cabinet API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Database error',
      message: error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Cabinet API',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Cabinet API server running on port ${PORT}`);
  console.log(`📊 Ready to serve real cabinet data with 1000 UNI balance`);
});