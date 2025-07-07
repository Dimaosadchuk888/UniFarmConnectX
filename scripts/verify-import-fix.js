import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

async function verifyImportFix() {
  console.log('🔍 Проверка исправления динамического импорта');
  console.log('='.repeat(50));
  
  try {
    // Тестируем динамический импорт как в исправленном middleware
    console.log('📋 Тест динамического импорта:');
    const { SupabaseUserRepository } = await import('../modules/user/service.js');
    console.log('  ✅ Импорт успешен!');
    
    const userRepository = new SupabaseUserRepository();
    console.log('  ✅ Создан экземпляр userRepository');
    
    // Проверяем работу с user_id=62
    console.log('\n📋 Проверка поиска пользователя:');
    const user = await userRepository.getUserById(62);
    
    if (user) {
      console.log('  ✅ Пользователь найден через динамический импорт:');
      console.log(`    ID: ${user.id}`);
      console.log(`    telegram_id: ${user.telegram_id}`);
      console.log(`    username: ${user.username}`);
      console.log(`    ref_code: ${user.ref_code}`);
    } else {
      console.log('  ❌ Пользователь не найден');
    }
    
    // Симулируем полную логику middleware
    console.log('\n📋 Симуляция полной логики middleware:');
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYyLCJ0ZWxlZ3JhbV9pZCI6ODg4ODg4NDgsInVzZXJuYW1lIjoicHJldmlld191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MTc4MDUyMTkxOF9lMXY2MmQiLCJpYXQiOjE3NTE4NzA1OTAsImV4cCI6MTc1MjQ3NTM5MH0._-B0ARIvZq9mvukXC5sp_09jNbo5JX5ycCJRxFMa-mY';
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.user_id;
    console.log(`  Извлечен userId из JWT: ${userId}`);
    
    const fullUser = await userRepository.getUserById(userId);
    if (fullUser) {
      console.log('  ✅ Middleware логика работает правильно!');
      console.log('  Пользователь будет авторизован');
    } else {
      console.log('  ❌ Пользователь не найден - будет 401');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('Stack:', error.stack);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Проверка завершена');
  console.log('\n⚡ ВАЖНО: Исправление сработает после перезапуска сервера!');
}

verifyImportFix();