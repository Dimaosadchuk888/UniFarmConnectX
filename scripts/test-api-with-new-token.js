import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

async function testAPIWithNewToken() {
  console.log('🔍 Тестирование API после исправления middleware');
  console.log('='.repeat(50));
  
  // Создаем новый JWT токен для user_id=62
  const token = jwt.sign(
    {
      userId: 62,
      telegram_id: 88888848,
      username: 'preview_user',
      ref_code: 'REF_1751780521918_e1v62d'
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  console.log('📋 Создан новый JWT токен для user_id=62');
  
  const endpoints = [
    '/api/v2/users/profile',
    '/api/v2/farming/status',
    '/api/v2/wallet/balance',
    '/api/v2/wallet/balance?user_id=62'
  ];
  
  console.log('\n🧪 Тестирование endpoints:');
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const status = response.status;
      const statusText = response.statusText;
      
      let result = '';
      if (status === 200) {
        const data = await response.json();
        result = data.success ? '✅ OK' : '❌ FAIL';
        if (data.data?.user?.id) {
          result += ` (user_id: ${data.data.user.id})`;
        }
      } else {
        result = `❌ ${status} ${statusText}`;
      }
      
      console.log(`  ${endpoint}: ${result}`);
      
    } catch (error) {
      console.log(`  ${endpoint}: ❌ Error - ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Итоги:');
  console.log('  - Если /users/profile и /farming/status теперь возвращают 200 OK, значит исправление работает!');
  console.log('  - Если все еще 401, нужно перезапустить сервер через npm run dev');
}

testAPIWithNewToken();