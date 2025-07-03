/**
 * Получение данных пользователя из базы данных для создания правильного JWT
 */

const fetch = require('node-fetch');

async function getUserData() {
  console.log('🔍 Получение данных пользователя из API...');
  
  try {
    // Пытаемся получить данные пользователя через API
    const response = await fetch('http://localhost:3000/api/v2/users/profile', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.data && data.data.user) {
      const user = data.data.user;
      
      console.log('✅ Данные пользователя получены:');
      console.log(`  ID: ${user.id}`);
      console.log(`  telegram_id: ${user.telegram_id}`);
      console.log(`  username: ${user.username}`);
      console.log(`  ref_code: ${user.ref_code}`);
      console.log(`  balance_uni: ${user.balance_uni}`);
      console.log(`  balance_ton: ${user.balance_ton}`);
      
      // Создаем JWT токен
      const jwt = require('jsonwebtoken');
      const tokenPayload = {
        userId: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name || 'Demo User',
        ref_code: user.ref_code,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 дней
      };
      
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'fallback_secret');
      
      console.log('\n🔑 JWT токен создан:');
      console.log(`Bearer ${token}`);
      
      // Создаем код для обновления client/index.html
      const htmlUpdateCode = `
      // Принудительно очищаем старые данные
      localStorage.clear();
      
      // Устанавливаем правильный JWT токен для пользователя ${user.id}
      const productionJWT = '${token}';
      
      // Сохраняем в localStorage для синхронизации всех компонентов
      localStorage.setItem('telegramJWT', productionJWT);
      console.log('[Production Setup] JWT токен обновлен для user_id=${user.id}');
      console.log('[Production Setup] Старые данные кэша очищены');
      
      // Принудительная перезагрузка для применения новых настроек
      if (!window.location.search.includes('reloaded=1')) {
        window.location.href = window.location.href + '?reloaded=1';
      }`;
      
      console.log('\n📝 Код для обновления client/index.html:');
      console.log(htmlUpdateCode);
      
      return {
        user,
        token,
        htmlCode: htmlUpdateCode
      };
      
    } else {
      console.log('❌ Не удалось получить данные пользователя');
      console.log('Response:', data);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// Запускаем скрипт
getUserData().then(result => {
  if (result) {
    console.log('\n✅ Скрипт завершен успешно');
  }
}).catch(error => {
  console.error('❌ Ошибка выполнения скрипта:', error.message);
});