import { useEffect } from 'react';

// Компонент для принудительного переключения на пользователя 50
export function ForceUserSwitch() {
  useEffect(() => {
    console.log('[ForceUserSwitch] Проверка необходимости переключения на пользователя 50');
    
    // Проверяем флаг переключения
    const switchFlag = localStorage.getItem('unifarm_user_50_active');
    
    if (switchFlag === 'true') {
      console.log('[ForceUserSwitch] Пользователь 50 уже активен, пропускаем переключение');
      return;
    }
    
    console.log('[ForceUserSwitch] Переключение на пользователя 50...');
    
    // Очищаем ВСЕ старые данные для чистого старта
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key !== 'unifarm_user_50_active') {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      console.log('[ForceUserSwitch] Удаляем старый ключ:', key);
      localStorage.removeItem(key);
    });
    
    // Устанавливаем правильные данные для пользователя 50
    const user50Data = {
      id: 50,
      telegram_id: 43,
      username: 'demo_user',
      ref_code: 'REF_1751432118013_x06tsz',
      balance_uni: 1000,
      balance_ton: 1000,
      first_name: 'Demo',
      last_name: 'User'
    };
    
    // Сохраняем данные пользователя
    localStorage.setItem('unifarm_user', JSON.stringify(user50Data));
    
    // Сохраняем сессию
    const session = {
      timestamp: new Date().toISOString(),
      user_id: 50,
      username: 'demo_user',
      refCode: 'REF_1751432118013_x06tsz'
    };
    localStorage.setItem('unifarm_last_session', JSON.stringify(session));
    
    // Генерируем и сохраняем правильный JWT токен для пользователя 50
    // JWT с правильным userId: 50 (не 88888888!)
    const jwt50 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUwLCJ0ZWxlZ3JhbV9pZCI6NDMsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MTQzMjExODAxM194MDZ0c3oiLCJpYXQiOjE3NTE0MzQzNjksImV4cCI6MTc1MjAzOTE2OX0.Q-wk2OM7BI8_E0xAVC9vI10I4cJECoIpdgLb4t6_AzU';
    localStorage.setItem('unifarm_jwt_token', jwt50);
    
    // Устанавливаем флаг, что пользователь 50 активен
    localStorage.setItem('unifarm_user_50_active', 'true');
    
    console.log('[ForceUserSwitch] Данные пользователя 50 установлены:', {
      user: user50Data,
      jwt: 'JWT с userId=50 установлен'
    });
    
    // Перезагружаем страницу для применения изменений
    console.log('[ForceUserSwitch] Перезагрузка для применения пользователя 50...');
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }, []);
  
  return null;
}