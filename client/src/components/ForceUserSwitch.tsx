import React, { useEffect } from 'react';

export const ForceUserSwitch: React.FC = () => {
  useEffect(() => {
    // Проверяем, нужно ли переключиться на пользователя 50
    const needSwitch = localStorage.getItem('unifarm_switch_to_user_50');
    
    if (!needSwitch) {
      console.log('[ForceUserSwitch] Инициируем переключение на пользователя 50...');
      
      // Очищаем ВСЕ данные
      localStorage.clear();
      sessionStorage.clear();
      
      // Устанавливаем новые данные для пользователя 50
      const newJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUwLCJ0ZWxlZ3JhbV9pZCI6NDMsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MTQzMjExODAxM194MDZ0c3oiLCJpYXQiOjE3NTE0MzQzNjksImV4cCI6MTc1MjAzOTE2OX0.Q-wk2OM7BI8_E0xAVC9vI10I4cJECoIpdgLb4t6_AzU';
      
      localStorage.setItem('unifarm_jwt_token', newJwt);
      localStorage.setItem('unifarm_last_session', JSON.stringify({
        timestamp: new Date().toISOString(),
        user_id: 50,
        username: 'demo_user',
        refCode: 'REF_1751432118013_x06tsz'
      }));
      localStorage.setItem('unifarm_switch_to_user_50', 'true');
      
      console.log('[ForceUserSwitch] Данные пользователя 50 установлены, перезагружаем страницу...');
      
      // Принудительная перезагрузка
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } else {
      console.log('[ForceUserSwitch] Пользователь 50 уже активирован');
    }
  }, []);
  
  return null;
};