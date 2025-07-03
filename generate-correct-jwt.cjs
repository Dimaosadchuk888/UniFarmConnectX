/**
 * Генерация корректного JWT токена для пользователя 48
 * с правильным telegram_id=88888888
 */

const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET || 'unifarm_jwt_secret_key_2025_production';

const payload = {
  userId: 48,
  telegram_id: 88888888,
  username: 'demo_user',
  first_name: 'Demo User',  
  ref_code: 'REF_1750952576614_t938vs',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 дней
};

const token = jwt.sign(payload, jwtSecret);

console.log('\n=== ПРАВИЛЬНЫЙ JWT ТОКЕН ===');
console.log('Payload:', JSON.stringify(payload, null, 2));
console.log('\nJWT Token:');
console.log(token);

// Проверяем что токен валидный
try {
  const decoded = jwt.verify(token, jwtSecret);
  console.log('\n=== ПРОВЕРКА ТОКЕНА ===');
  console.log('Decoded:', JSON.stringify(decoded, null, 2));
  console.log('\n✅ Токен корректный и готов к использованию');
} catch (error) {
  console.log('\n❌ Ошибка проверки токена:', error.message);
}