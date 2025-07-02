/**
 * Генерация JWT токена для пользователя 50
 */

import jwt from 'jsonwebtoken';
import { config } from './core/config.ts';

// Данные пользователя 50 из системы
const payload = {
  userId: 50,
  telegram_id: 43,
  username: 'demo_user',
  ref_code: 'REF_1751432118013_x06tsz'
};

// Генерируем токен
const token = jwt.sign(payload, config.auth.jwtSecret, {
  expiresIn: '7d'
});

console.log('JWT токен для пользователя 50:');
console.log(token);
console.log('\nPayload:');
console.log(payload);
console.log('\nСрок действия: 7 дней');