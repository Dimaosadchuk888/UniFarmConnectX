import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// ВАЖНО: Используйте переменную окружения для JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ ОШИБКА: JWT_SECRET не установлен в переменных окружения');
  console.error('Установите JWT_SECRET в файле .env');
  process.exit(1);
}

// Тестовые данные - изменяйте по необходимости
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