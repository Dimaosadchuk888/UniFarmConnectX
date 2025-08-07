import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// JWT токен из логов браузера
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYyLCJ0ZWxlZ3JhbV9pZCI6ODg4ODg4NDgsInVzZXJuYW1lIjoicHJldmlld191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MTc4MDUyMTkxOF9lMXY2MmQiLCJpYXQiOjE3NTE4Njk5NzYsImV4cCI6MTc1MjQ3NDc3Nn0.3OX9TDF5XpRW8PUHeozdIoBRIl-UWvjNJWKHbn56Fso';

console.log('🔐 ЗАДАЧА 2: Проверка JWT токена и декодирования');
console.log('='.repeat(50));

try {
  // Декодируем токен без проверки
  const decoded = jwt.decode(token);
  console.log('📋 Декодированный payload:');
  console.log(JSON.stringify(decoded, null, 2));
  
  console.log('\n🔍 Анализ данных:');
  console.log(`  userId: ${decoded.userId}`);
  console.log(`  telegram_id: ${decoded.telegram_id}`);
  console.log(`  username: ${decoded.username}`);
  console.log(`  ref_code: ${decoded.ref_code}`);
  console.log(`  Создан: ${new Date(decoded.iat * 1000).toISOString()}`);
  console.log(`  Истекает: ${new Date(decoded.exp * 1000).toISOString()}`);
  
  // Проверяем валидность с нашим секретом
  console.log('\n✅ Проверка подписи с JWT_SECRET...');
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Токен валиден! Подпись корректна.');
  } catch (verifyError) {
    console.error('❌ Токен невалиден:', verifyError.message);
  }
  
  // Проверяем middleware логику
  console.log('\n🔧 Симуляция middleware логики:');
  const userId = decoded.userId || decoded.user_id;
  console.log(`  Извлеченный userId для поиска: ${userId}`);
  console.log(`  Тип userId: ${typeof userId}`);
  
  if (userId !== 62) {
    console.log('⚠️ ВНИМАНИЕ: userId в токене не равен 62!');
  }
  
  // Проверяем рассинхронизацию
  console.log('\n📊 Проверка на рассинхронизацию:');
  console.log(`  ref_code в токене: ${decoded.ref_code}`);
  console.log(`  ref_code в БД: REF_1751780521918_e1v62d`);
  console.log(`  Совпадают: ${decoded.ref_code === 'REF_1751780521918_e1v62d' ? '✅ ДА' : '❌ НЕТ'}`);
  
} catch (error) {
  console.error('💥 Ошибка при анализе токена:', error);
}

console.log('\n' + '='.repeat(50));
console.log('✅ Анализ завершен');