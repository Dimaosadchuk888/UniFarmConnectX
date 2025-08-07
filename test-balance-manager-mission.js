import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Generate a fresh JWT token for user 74
const JWT_SECRET = process.env.JWT_SECRET;
console.log('JWT_SECRET set:', !!JWT_SECRET);

const payload = {
  userId: 74,
  telegram_id: 999489,
  username: 'test_user_1752129840905',
  ref_code: 'TEST_1752129840905_dokxv0'
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
console.log('\n🔑 New JWT token for user 74:');
console.log(token);

// Test the token by decoding it
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('\n✅ Token verification successful:');
  console.log('- userId:', decoded.userId);
  console.log('- telegram_id:', decoded.telegram_id);
  console.log('- Expires:', new Date(decoded.exp * 1000).toLocaleString());
} catch (err) {
  console.error('\n❌ Token verification failed:', err.message);
}

// Test with the new token
console.log('\n🧪 Testing API with new token...\n');

import('node-fetch').then(({ default: fetch }) => {
  const baseUrl = 'http://localhost:3000';
  
  fetch(`${baseUrl}/api/v2/users/profile?user_id=74`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(res => res.json())
  .then(data => {
    console.log('Profile API response:', JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error('API error:', err);
  });
});