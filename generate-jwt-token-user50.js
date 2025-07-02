/**
 * Генерация JWT токена для пользователя 50
 */

const jwt = require('jsonwebtoken');

// Данные пользователя 50
const userData = {
  userId: 50,
  telegram_id: 43,
  username: 'demo_user',
  ref_code: 'REF_1751432118013_x06tsz'
};

// Генерируем токен
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const token = jwt.sign(userData, jwtSecret, { expiresIn: '7d' });

console.log('=== JWT Token для пользователя 50 ===');
console.log('Token:', token);
console.log('\nДанные токена:', userData);
console.log('\nИспользуйте этот токен для авторизации');