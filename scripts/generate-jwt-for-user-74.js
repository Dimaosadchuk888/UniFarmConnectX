import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Получаем JWT секрет из переменных окружения
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET не установлен в переменных окружения');
  process.exit(1);
}

// Данные для пользователя ID 74
const payload = {
  userId: 74,
  telegram_id: 999489,
  username: 'test_user_1752129840905',
  ref_code: 'TEST_1752129840905_dokxv0'
};

// Генерируем токен с 7-дневным сроком действия
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

console.log('✅ JWT токен для пользователя ID 74:');
console.log(token);
console.log('\n📋 Скопируйте и используйте этот токен для авторизации');

// Декодируем для проверки
const decoded = jwt.decode(token);
console.log('\n🔍 Декодированные данные:');
console.log(decoded);