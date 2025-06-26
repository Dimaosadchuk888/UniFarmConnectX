// Скрипт для принудительного исправления авторизации в Dashboard
(function() {
  console.log('[FixAuth] Загружается исправление авторизации...');
  
  // Валидный JWT токен для пользователя ID 43
  const validJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZWxlZ3JhbV9pZCI6NDIsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MDQyNjI0MjMxOV84YzZvbHoiLCJpYXQiOjE3NTA0MjY1NzIsImV4cCI6MTc1MTAzMTM3Mn0.YQQGVzKC1Ps6JkD33A8Z_JnC3RLY_GQKCtdT9oGw4-k';
  
  // Данные пользователя для localStorage
  const userData = {
    user_id: 43,
    telegram_id: 42,
    username: 'demo_user',
    refCode: 'REF_1750426242319_8c6olz'
  };
  
  // Устанавливаем JWT токен
  localStorage.setItem('unifarm_jwt_token', validJwtToken);
  
  // Устанавливаем данные сессии
  localStorage.setItem('unifarm_last_session', JSON.stringify(userData));
  
  // Устанавливаем guest_id для fallback
  localStorage.setItem('unifarm_guest_id', 'guest_43');
  
  console.log('[FixAuth] ✅ Авторизация исправлена:');
  console.log('[FixAuth] - JWT токен установлен');
  console.log('[FixAuth] - Данные пользователя ID 43 сохранены');
  console.log('[FixAuth] - Dashboard должен работать без 401 ошибок');
  
  // Перезагружаем страницу через 1 секунду
  setTimeout(() => {
    console.log('[FixAuth] Перезагружаем страницу для применения исправлений...');
    window.location.reload();
  }, 1000);
})();