CREATE TABLE IF NOT EXISTS boost_purchases (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  boost_id INTEGER NOT NULL,
  amount TEXT NOT NULL,
  daily_rate TEXT NOT NULL,
  source TEXT CHECK (source IN ('wallet', 'ton')) NOT NULL,
  tx_hash TEXT,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'failed')) DEFAULT 'pending',
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP,
  last_claim TIMESTAMP,
  total_earned TEXT DEFAULT '0',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
