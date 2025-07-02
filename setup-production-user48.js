/**
 * Скрипт для настройки продакшн пользователя 48
 * Генерирует правильный JWT токен и настраивает систему
 */

import jwt from 'jsonwebtoken';

// Секретный ключ из переменных окружения
const JWT_SECRET = process.env.JWT_SECRET || 'unifarm_jwt_secret_key_2025_production';

// Данные пользователя 48 для продакшн режима
const userData = {
  userId: 48,
  telegram_id: 999, // Нормальный telegram_id вместо demo 43
  username: 'ataras',
  ref_code: 'REF_1750952576614_t938vs'
};

// Генерируем JWT токен
const token = jwt.sign(userData, JWT_SECRET, {
  expiresIn: '7d',
  algorithm: 'HS256'
});

console.log('=== UniFarm Production Setup для User ID 48 ===');
console.log('');
console.log('1. JWT токен сгенерирован:');
console.log(token);
console.log('');
console.log('2. Данные пользователя:');
console.log(JSON.stringify(userData, null, 2));
console.log('');
console.log('3. Скопируйте и выполните этот код в консоли браузера:');
console.log('');
console.log(`
// Очистка и установка продакшн данных для user 48
(function() {
  console.log('🔧 Настройка продакшн режима для user 48...');
  
  // Очищаем все старые данные
  localStorage.clear();
  sessionStorage.clear();
  
  // Устанавливаем новый JWT токен
  const jwt = '${token}';
  
  // Данные пользователя
  const userData = ${JSON.stringify(userData, null, 2)};
  
  // Сохраняем в localStorage
  localStorage.setItem('jwt_token', jwt);
  localStorage.setItem('authToken', jwt);
  localStorage.setItem('unifarm_jwt_token', jwt);
  localStorage.setItem('userId', '48');
  localStorage.setItem('userData', JSON.stringify({
    id: 48,
    telegram_id: 999,
    username: 'ataras',
    ref_code: 'REF_1750952576614_t938vs'
  }));
  localStorage.setItem('isAuthenticated', 'true');
  
  console.log('✅ Продакшн режим активирован!');
  console.log('📌 User ID: 48');
  console.log('🔐 JWT токен установлен');
  console.log('🚀 Перезагрузка через 2 секунды...');
  
  setTimeout(() => {
    window.location.reload();
  }, 2000);
})();
`);