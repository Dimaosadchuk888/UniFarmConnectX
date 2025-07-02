/**
 * Скрипт для исправления конфликта пользователей
 * Устанавливает корректный JWT токен для пользователя 50
 * 
 * Выполните этот код в консоли браузера (F12)
 */

console.log('🔧 Начинаем исправление конфликта пользователей...');

// 1. Очищаем весь localStorage
console.log('📦 Очистка localStorage...');
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key) {
    keysToRemove.push(key);
  }
}

keysToRemove.forEach(key => {
  console.log(`  ❌ Удаляем: ${key}`);
  localStorage.removeItem(key);
});

console.log('✅ localStorage очищен полностью');

// 2. Генерируем новый JWT токен для пользователя 50
// Данные взяты из логов: user_id=50, telegram_id=43
const newJwtPayload = {
  userId: 50,
  telegram_id: 43,
  username: 'demo_user',
  ref_code: 'REF_1751432118013_x06tsz',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 дней
};

// Используем валидный JWT токен для user 50 из ForceUserSwitch компонента
const validJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUwLCJ0ZWxlZ3JhbV9pZCI6NDMsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MTQzMjExODAxM194MDZ0c3oiLCJpYXQiOjE3NTE0MzQzNjksImV4cCI6MTc1MjAzOTE2OX0.Q-wk2OM7BI8_E0xAVC9vI10I4cJECoIpdgLb4t6_AzU';

// 3. Устанавливаем новые данные
console.log('💾 Установка данных для пользователя 50...');

// JWT токен
localStorage.setItem('unifarm_jwt_token', validJwtToken);
console.log('  ✅ JWT токен установлен');

// Данные пользователя
const userData = {
  id: 50,
  telegram_id: 43,
  username: 'demo_user',
  ref_code: 'REF_1751432118013_x06tsz',
  balance_uni: '10889.020122',
  balance_ton: '999'
};
localStorage.setItem('unifarm_user', JSON.stringify(userData));
console.log('  ✅ Данные пользователя установлены');

// Сессия
const sessionData = {
  timestamp: new Date().toISOString(),
  user_id: 50,
  username: 'demo_user',
  refCode: 'REF_1751432118013_x06tsz'
};
localStorage.setItem('unifarm_last_session', JSON.stringify(sessionData));
console.log('  ✅ Данные сессии установлены');

// Guest ID (для совместимости)
localStorage.setItem('unifarm_guest_id', 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
console.log('  ✅ Guest ID установлен');

// 4. Выводим итоговую информацию
console.log('\n📊 Итоговые данные:');
console.log('  User ID: 50');
console.log('  Telegram ID: 43');
console.log('  Username: demo_user');
console.log('  Ref Code: REF_1751432118013_x06tsz');

// Декодируем JWT для проверки
try {
  const payload = JSON.parse(atob(validJwtToken.split('.')[1]));
  console.log('\n🔐 JWT Payload:', payload);
} catch (e) {
  console.error('Ошибка декодирования JWT:', e);
}

console.log('\n✅ Все данные установлены!');
console.log('🔄 Теперь перезагрузите страницу (F5) для применения изменений');