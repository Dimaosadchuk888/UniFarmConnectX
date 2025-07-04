import jwt from 'jsonwebtoken';

async function testAuthFix() {
  console.log('🧪 ТЕСТИРОВАНИЕ ИСПРАВЛЕНИЯ АВТОРИЗАЦИИ');
  
  const jwtSecret = process.env.JWT_SECRET || 'unifarm_jwt_secret_key_2025_production';
  
  // Создаём новый JWT токен для пользователя 61
  const newJwtPayload = {
    userId: 61,
    telegram_id: 123456789,
    username: 'test_new_auth_user',
    ref_code: 'REF_1751646496183_new_auth'
  };
  
  const newToken = jwt.sign(newJwtPayload, jwtSecret, { expiresIn: '7d' });
  console.log('🎫 Создан JWT для пользователя 61:', newJwtPayload);
  
  // Тест 1: API /users/profile с новым токеном
  try {
    const response = await fetch('http://localhost:3000/api/v2/users/profile', {
      headers: {
        'Authorization': `Bearer ${newToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('\n📊 API /users/profile результат:');
    console.log('- Success:', result.success);
    console.log('- User ID:', result.data?.user?.id);
    console.log('- Telegram ID:', result.data?.user?.telegram_id);
    console.log('- Username:', result.data?.user?.username);
    
    if (result.data?.user?.id === 61) {
      console.log('✅ SUCCESS! Middleware теперь использует правильный user_id из JWT!');
    } else {
      console.log('❌ Middleware всё ещё использует неправильный user_id:', result.data?.user?.id);
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования API:', error.message);
  }
  
  // Тест 2: API /uni-farming/status с новым токеном
  try {
    const response = await fetch('http://localhost:3000/api/v2/uni-farming/status', {
      headers: {
        'Authorization': `Bearer ${newToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('\n📊 API /uni-farming/status результат:');
    console.log('- Success:', result.success);
    console.log('- User в контроллере должен быть 61');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования farming API:', error.message);
  }
  
  console.log('\n🔧 Инструкции для устранения проблемы:');
  console.log('1. Сервер нужно перезапустить для применения изменений middleware');
  console.log('2. В браузере удалить старый JWT токен из localStorage');
  console.log('3. Установить новый JWT токен:');
  console.log(`   localStorage.setItem('authToken', '${newToken}');`);
  console.log('4. Перезагрузить страницу');
}

testAuthFix().catch(console.error);