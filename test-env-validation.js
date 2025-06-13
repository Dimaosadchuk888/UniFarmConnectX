/**
 * Тест валидации переменных окружения
 */

// Сохраняем оригинальные значения
const originalEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  SESSION_SECRET: process.env.SESSION_SECRET,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  PORT: process.env.PORT
};

console.log('🧪 Тестирование валидации переменных окружения...');

// Тест 1: Удаляем обязательную переменную DATABASE_URL
console.log('\n📋 Тест 1: Отсутствует DATABASE_URL');
delete process.env.DATABASE_URL;

try {
  // Имитируем валидацию
  const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET', 'TELEGRAM_BOT_TOKEN', 'PORT'];
  const missingVars = [];
  
  for (const envVar of requiredVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }
  
  if (missingVars.length > 0) {
    console.log(`❌ Обнаружены отсутствующие переменные: ${missingVars.join(', ')}`);
    console.log('✅ Валидация корректно обнаружила ошибку');
  } else {
    console.log('❌ Валидация не сработала');
  }
} catch (error) {
  console.log('✅ Валидация корректно выбросила ошибку:', error.message);
}

// Восстанавливаем переменные
Object.assign(process.env, originalEnv);

// Тест 2: Все переменные присутствуют
console.log('\n📋 Тест 2: Все обязательные переменные присутствуют');
const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET', 'TELEGRAM_BOT_TOKEN', 'PORT'];
const missingVars = [];

for (const envVar of requiredVars) {
  if (!process.env[envVar]) {
    missingVars.push(envVar);
  }
}

if (missingVars.length === 0) {
  console.log('✅ Все обязательные переменные присутствуют');
} else {
  console.log(`❌ Отсутствуют переменные: ${missingVars.join(', ')}`);
}

console.log('\n🎯 Тест валидации завершен');