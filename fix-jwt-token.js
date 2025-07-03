/**
 * Генерация правильного JWT токена для пользователя 48
 * с корректным telegram_id = 88888888
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Корректные данные пользователя ID=48 из базы данных
const userPayload = {
  userId: 48,
  telegram_id: 88888888,  // Исправлен telegram_id 
  username: 'demo_user',
  ref_code: 'REF_1750952576614_t938vs',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 дней
};

const token = jwt.sign(userPayload, JWT_SECRET);

console.log('=== ИСПРАВЛЕННЫЙ JWT ТОКЕН ===');
console.log('Token:', token);
console.log('\nPayload:', JSON.stringify(userPayload, null, 2));

console.log('\n=== КОД ДЛЯ БРАУЗЕРА ===');
console.log(`localStorage.setItem('auth_token', '${token}');`);
console.log('localStorage.getItem("auth_token");');
console.log('location.reload();');

console.log('\n=== ТЕСТ CURL ===');
console.log(`curl -s "http://localhost:3000/api/v2/users/profile" -H "Authorization: Bearer ${token}" | jq '.data.user | {id, telegram_id, username, ref_code, balance_uni, balance_ton}'`);