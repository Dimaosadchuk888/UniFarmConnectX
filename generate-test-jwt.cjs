const jwt = require('jsonwebtoken');

// Тестовый пользователь ID 74
const payload = {
  userId: 74,
  telegramId: 999489,
  username: 'test_user_1752129840905',
  refCode: 'TEST_1752129840905_dokxv0'
};

// JWT секрет из переменной окружения
const secret = process.env.JWT_SECRET || 'unifarm_jwt_secret_key_2025_production';

// Генерируем токен с 7-дневным сроком действия
const token = jwt.sign(payload, secret, { expiresIn: '7d' });

console.log('Новый JWT токен для пользователя ID 74:');
console.log(token);
console.log('\nПолезная нагрузка:');
console.log(JSON.stringify(payload, null, 2));