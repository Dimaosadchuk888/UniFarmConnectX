/**
 * Генерация правильного JWT токена для пользователя 48
 * с исправленным telegram_id = 88888888
 */
import jwt from 'jsonwebtoken';

// Правильные данные для пользователя 48
const payload = {
  userId: 48,  // ID пользователя в базе данных
  telegram_id: 88888888, // telegram_id пользователя
  username: 'demo_user',
  ref_code: 'REF_1750952576614_t938vs'  // Правильный ref_code из логов
};

// Используем тот же secret и параметры, что и в системе
const secret = process.env.JWT_SECRET || 'your-secret-key';
const options = {
  expiresIn: '7d' // 7 дней как в системе
};

// Генерируем токен
const token = jwt.sign(payload, secret, options);

console.log('=== НОВЫЙ JWT ТОКЕН ДЛЯ ПОЛЬЗОВАТЕЛЯ 48 ===');
console.log('');
console.log('Payload:', payload);
console.log('');
console.log('JWT Token:');
console.log(token);
console.log('');
console.log('Добавьте этот токен в client/index.html в строку 50');
console.log('');