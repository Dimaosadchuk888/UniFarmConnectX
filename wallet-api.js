/**
 * Прямой API для отображения баланса кошелька
 * Подключается к PostgreSQL и возвращает реальные данные пользователя
 */

const express = require('express');
const { Pool } = require('pg');
const app = express();

// CORS для Telegram WebApp
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Guest-Id');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Подключение к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// API для получения пользователя по ID
app.get('/api/users/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    console.log(`[WALLET API] Запрос пользователя ID: ${user_id}`);
    
    const result = await pool.query(
      'SELECT id, username, guest_id, telegram_id, uni_balance, ton_balance, ref_code FROM users WHERE id = $1 LIMIT 1', 
      [user_id]
    );
    
    if (result.rows.length === 0) {
      console.log(`[WALLET API] Пользователь не найден: ${user_id}`);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = result.rows[0];
    console.log(`[WALLET API] Найден пользователь: ${user.username}, Баланс UNI: ${user.uni_balance}, TON: ${user.ton_balance}`);
    
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        guest_id: user.guest_id,
        uni_balance: parseFloat(user.uni_balance) || 0,
        ton_balance: parseFloat(user.ton_balance) || 0,
        balance_uni: parseFloat(user.uni_balance) || 0,
        balance_ton: parseFloat(user.ton_balance) || 0,
        ref_code: user.ref_code
      }
    });
  } catch (error) {
    console.error('[WALLET API] Ошибка получения пользователя:', error.message);
    res.status(500).json({
      success: false,
      error: 'Database error',
      message: error.message
    });
  }
});

// API для транзакций
app.get('/api/v2/transactions', async (req, res) => {
  try {
    const user_id = req.query.user_id || '1';
    console.log(`[WALLET API] Запрос транзакций для пользователя: ${user_id}`);
    
    res.json({
      success: true,
      data: [],
      total: 0,
      message: 'No transactions yet'
    });
  } catch (error) {
    console.error('[WALLET API] Ошибка получения транзакций:', error.message);
    res.status(500).json({
      success: false,
      error: 'Transactions error'
    });
  }
});

// Проверка состояния API
app.get('/api/wallet/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    res.json({
      status: 'ok',
      users_count: result.rows[0].count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[WALLET API] 🚀 Сервер запущен на порту ${PORT}`);
  console.log(`[WALLET API] 🔗 Доступен по адресу: http://localhost:${PORT}`);
});