const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/v2/users/profile', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 1,
      guest_id: 'guest_demo',
      balance_uni: '1000.000000',
      balance_ton: '5.500000',
      uni_farming_balance: '250.000000',
      uni_farming_rate: '0.500000',
      uni_deposit_amount: '500.000000'
    }
  });
});

app.get('/api/v2/daily-bonus/status', (req, res) => {
  res.json({
    success: true,
    data: {
      can_claim: true,
      streak: 1,
      bonus_amount: 100
    }
  });
});

app.get('/api/v2/wallet/balance', (req, res) => {
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

app.get('/api/v2/health', (req, res) => {
  res.json({ success: true, data: [] });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});