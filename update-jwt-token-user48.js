/**
 * Скрипт для обновления JWT токена на userId: 48
 * Выполните этот скрипт в консоли браузера
 */

// Новый JWT токен с правильным userId: 48
const newToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQ4LCJ0ZWxlZ3JhbV9pZCI6ODg4ODg4ODgsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MDk1MjU3NjYxNF90OTM4dnMiLCJpYXQiOjE3NTE0NDM5MjAsImV4cCI6MTc1MjA0ODcyMH0.sG3CxMasM1RGgQQ-z5tSAeQWPu9dIeflxaMeWwOVnKA';

// Обновляем JWT токен в localStorage
localStorage.setItem('unifarm_jwt_token', newToken);

// Проверяем что токен обновлен
console.log('✅ JWT токен обновлен!');
console.log('Новый токен:', newToken);

// Декодируем и показываем payload
const payload = JSON.parse(atob(newToken.split('.')[1]));
console.log('\nPayload токена:', payload);
console.log('- userId:', payload.userId);
console.log('- telegram_id:', payload.telegram_id);
console.log('- username:', payload.username);
console.log('- ref_code:', payload.ref_code);

// Обновляем данные пользователя если нужно
const userData = {
    id: 48,
    telegram_id: 88888888,
    username: 'demo_user',
    ref_code: 'REF_1750952576614_t938vs',
    balance_uni: '10889.008458',
    balance_ton: '999'
};
localStorage.setItem('unifarm_user', JSON.stringify(userData));

console.log('\n✅ Данные пользователя обновлены!');
console.log('Пользователь:', userData);

// Инструкция
console.log('\n📌 Теперь обновите страницу (F5) чтобы изменения вступили в силу');