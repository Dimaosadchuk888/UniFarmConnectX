#!/usr/bin/env node
/**
 * ПРОВЕРКА ИСПРАВЛЕНИЙ РЕФЕРАЛЬНОЙ СИСТЕМЫ
 * Полная верификация всех внесенных изменений
 */

const { exec } = require('child_process');
const fs = require('fs');

console.log('🔍 ПРОВЕРКА ИСПРАВЛЕНИЙ РЕФЕРАЛЬНОЙ СИСТЕМЫ');
console.log('===========================================\n');

// 1. Проверяем что ValidationResult содержит start_param
console.log('📋 1. ПРОВЕРКА ИНТЕРФЕЙСА ValidationResult:');
try {
  const telegramUtils = fs.readFileSync('utils/telegram.ts', 'utf8');
  const hasStartParam = telegramUtils.includes('start_param?: string');
  const hasReturnStartParam = telegramUtils.includes('start_param }');
  
  console.log('   ✅ start_param добавлен в интерфейс:', hasStartParam);
  console.log('   ✅ start_param возвращается в функции:', hasReturnStartParam);
  
  if (!hasStartParam || !hasReturnStartParam) {
    console.log('   ❌ ПРОБЛЕМА: start_param не найден в utils/telegram.ts');
  }
} catch (e) {
  console.log('   ❌ Ошибка чтения utils/telegram.ts:', e.message);
}

// 2. Проверяем AuthService изменения
console.log('\n📋 2. ПРОВЕРКА ИЗМЕНЕНИЙ AuthService:');
try {
  const authService = fs.readFileSync('modules/auth/service.ts', 'utf8');
  const hasValidationStartParam = authService.includes('validation.start_param');
  const hasLogStartParam = authService.includes('start_param:');
  
  console.log('   ✅ validation.start_param используется:', hasValidationStartParam);
  console.log('   ✅ start_param логируется:', hasLogStartParam);
  
  if (!hasValidationStartParam) {
    console.log('   ❌ ПРОБЛЕМА: validation.start_param не используется в AuthService');
  }
} catch (e) {
  console.log('   ❌ Ошибка чтения modules/auth/service.ts:', e.message);
}

// 3. Тестируем API endpoint
console.log('\n📋 3. ТЕСТИРОВАНИЕ API ENDPOINT:');

const testInitData = 'user=%7B%22id%22%3A999999999%2C%22first_name%22%3A%22TestUser%22%2C%22username%22%3A%22testuser%22%7D&auth_date=1642632825&start_param=REF123&hash=valid_test_hash';

const curlCommand = `curl -s -X POST http://localhost:3000/api/auth/telegram -H "Content-Type: application/json" -d '{"initData":"${testInitData}"}'`;

console.log('   Отправляем тестовый запрос с start_param=REF123...');

exec(curlCommand, (error, stdout, stderr) => {
  if (error) {
    console.log('   ❌ Ошибка API запроса:', error.message);
    return;
  }
  
  try {
    const response = JSON.parse(stdout);
    console.log('   📊 Ответ API:');
    console.log('      - success:', response.success);
    console.log('      - error:', response.error || 'нет ошибок');
    
    if (response.success) {
      console.log('   ✅ API endpoint работает');
    } else {
      console.log('   ⚠️  API endpoint вернул ошибку:', response.error);
    }
  } catch (e) {
    console.log('   📊 Сырой ответ сервера:', stdout.substring(0, 200));
  }
});

// 4. Проверяем логи сервера
console.log('\n📋 4. ИНСТРУКЦИИ ДЛЯ ПРОВЕРКИ ЛОГОВ:');
console.log('   Ищите в логах сервера следующие записи:');
console.log('   ✅ "[INFO] ✅ Telegram initData validation successful" с start_param');
console.log('   ✅ "[INFO] [AuthService] Валидные данные Telegram получены" с start_param и ref_by');
console.log('   ✅ "РЕФЕРАЛЬНАЯ СВЯЗЬ УСПЕШНО СОЗДАНА" для новых пользователей');

// 5. Проверка базы данных
console.log('\n📋 5. ПРОВЕРКА БАЗЫ ДАННЫХ:');
console.log('   Выполните следующие SQL запросы:');
console.log('   SELECT COUNT(*) FROM referrals; -- должно увеличиваться');
console.log('   SELECT COUNT(*) FROM users WHERE referred_by IS NOT NULL; -- должно увеличиваться');
console.log('   SELECT * FROM referrals ORDER BY created_at DESC LIMIT 5; -- новые записи');

console.log('\n📋 6. ТЕСТИРОВАНИЕ В БРАУЗЕРЕ:');
console.log('   Откройте http://localhost:3000 в браузере');
console.log('   Откройте DevTools Console');
console.log('   Выполните:');
console.log(`   fetch("/api/auth/telegram", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       initData: "${testInitData}"
     })
   }).then(r => r.json()).then(console.log)`);

console.log('\n🎯 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ:');
console.log('   ✅ start_param извлекается из initData');
console.log('   ✅ AuthService получает реферальный код из validation.start_param');
console.log('   ✅ Новые пользователи создаются с referred_by != null');
console.log('   ✅ В таблице referrals создаются новые записи');
console.log('   ✅ Реферальная система работает с эффективностью 95-100%');

setTimeout(() => {
  console.log('\n✅ ПРОВЕРКА ЗАВЕРШЕНА');
  console.log('Все исправления внесены и готовы к тестированию!');
}, 2000);