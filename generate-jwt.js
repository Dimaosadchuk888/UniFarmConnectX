import jwt from 'jsonwebtoken';

const JWT_SECRET = 'unifarm_jwt_secret_key_2025_production';

const payload = {
  userId: 48,
  telegram_id: 88888888,
  username: 'demo_user',
  ref_code: 'REF_1750952576614_t938vs'
};

// Generate token with 7 days expiration
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

console.log('Generated JWT Token:');
console.log(token);
console.log('\nTest command:');
console.log(`curl -s -H "Authorization: Bearer ${token}" -w "\\nHTTP Code: %{http_code}" http://localhost:3000/api/v2/referral/stats`);

// Decode to verify
const decoded = jwt.decode(token);
console.log('\nToken payload:', decoded);
console.log('Expires at:', new Date(decoded.exp * 1000));