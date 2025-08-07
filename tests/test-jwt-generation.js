import jwt from 'jsonwebtoken';

// Секрет из .env файла
const JWT_SECRET = 'unifarm_jwt_secret_key_2025_production';

// Данные пользователя 48
const payload = {
  userId: 48,
  telegram_id: 88888888,
  username: "demo_user",
  ref_code: "REF_1750952576614_t938vs"
};

// Генерируем новый токен
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

console.log('=== Новый JWT токен для тестирования ===');
console.log('Токен:', token);
console.log('\nДекодированные данные:');
console.log(jwt.decode(token));
console.log('\nИспользуйте этот токен в Authorization header:');
console.log(`Authorization: Bearer ${token}`);