/**
 * Скрипт для установки данных аккаунта разработки в браузере
 */

// Очищаем старые данные
localStorage.clear();

// Устанавливаем данные зарегистрированного аккаунта разработки
localStorage.setItem('unifarm_guest_id', 'dev-replit-1748680222');
localStorage.setItem('unifarm_user_id', '17');
localStorage.setItem('unifarm_username', 'replit_developer');
localStorage.setItem('unifarm_ref_code', 'DEV1748680222');

console.log('✅ Установлены данные аккаунта разработки');
console.log('Guest ID:', localStorage.getItem('unifarm_guest_id'));
console.log('User ID:', localStorage.getItem('unifarm_user_id'));
console.log('Username:', localStorage.getItem('unifarm_username'));
console.log('Ref Code:', localStorage.getItem('unifarm_ref_code'));

// Перезагружаем страницу для применения изменений
window.location.reload();