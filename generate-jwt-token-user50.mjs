/**
 * Генерация JWT токена для пользователя 50
 */
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Данные для пользователя 50
const payload = {
  userId: 50,
  telegram_id: 43,
  username: 'demo_user',
  ref_code: 'REF_1751432118013_x06tsz',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 дней
};

const token = jwt.sign(payload, JWT_SECRET);

console.log('JWT токен для пользователя 50:');
console.log(token);
console.log('\nPayload:');
console.log(JSON.stringify(payload, null, 2));