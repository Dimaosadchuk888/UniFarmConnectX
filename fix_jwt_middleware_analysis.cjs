console.log('🎯 АНАЛИЗ JWT MIDDLEWARE ПРОБЛЕМЫ');
console.log('================================');

console.log('📋 КОРНЕВАЯ ПРИЧИНА:');
console.log('Middleware ищет userId в JWT токене, но токен содержит только:');
console.log('- telegram_id: 999489');
console.log('- username: test_user_1752129840905'); 
console.log('- ref_code: REF_1752755835358_yjrusv');
console.log('');

console.log('❌ ПРОБЛЕМА в строке 48-59 telegramAuth.ts:');
console.log('const userId = decoded.userId || decoded.user_id;');
console.log('decoded.userId = undefined');
console.log('decoded.user_id = undefined');
console.log('userId = undefined');
console.log('');

console.log('✅ РЕШЕНИЕ:');
console.log('1. JWT токен создается БЕЗ поля userId/user_id');
console.log('2. Middleware должен искать пользователя по telegram_id');
console.log('3. Нужно изменить getUserById() на getUserByTelegramId()');
console.log('');

console.log('🔧 КОД ИЗМЕНЕНИЯ:');
console.log('Строка ~57: const fullUser = await userRepository.getUserById(userId);');
console.log('ЗАМЕНИТЬ НА: const fullUser = await userRepository.getUserByTelegramId(telegramId);');
console.log('');

console.log('📍 АЛЬТЕРНАТИВА:');
console.log('Добавить user_id в JWT токен при создании');
console.log('Но это потребует изменения всей системы авторизации');
console.log('');

console.log('🎯 РЕКОМЕНДАЦИЯ: Исправить middleware для поиска по telegram_id');