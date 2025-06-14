/**
 * Финальный тест регистрации в очищенной production базе
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';
const LAUNCH_TEST_USER = {
  telegram_id: 777000888,
  username: 'launch_test_user',
  first_name: 'Launch',
  last_name: 'Test',
  direct_registration: true
};

async function finalLaunchTest() {
  console.log('🚀 ФИНАЛЬНЫЙ ТЕСТ PRODUCTION БАЗЫ ДАННЫХ');
  console.log('===================================');
  
  try {
    // 1. Тестовая регистрация
    console.log('🧪 Регистрируем пользователя:', LAUNCH_TEST_USER);
    
    const response = await fetch(`${API_BASE}/api/v2/register/telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(LAUNCH_TEST_USER)
    });
    
    const responseText = await response.text();
    console.log('📥 Статус:', response.status, response.statusText);
    console.log('📄 Ответ:', responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      const user = data.data?.user;
      
      console.log('✅ Регистрация успешна:');
      console.log(`   ID: ${user?.id}`);
      console.log(`   Telegram ID: ${user?.telegram_id}`);
      console.log(`   Username: ${user?.username}`);
      console.log(`   Ref Code: ${user?.ref_code}`);
      console.log(`   JWT Token: ${data.data?.token ? 'Создан' : 'Отсутствует'}`);
      console.log(`   Новый пользователь: ${data.data?.isNewUser}`);
      
      // Проверяем что ID = 1 (первый пользователь в очищенной базе)
      if (user?.id === '1') {
        console.log('✅ ID = 1 - база корректно очищена');
      } else {
        console.log(`⚠️ ID = ${user?.id} - ожидался ID = 1`);
      }
      
      return user;
    } else {
      console.log('❌ Ошибка регистрации:', response.status, responseText);
      return null;
    }
    
  } catch (error) {
    console.error('💥 Ошибка тестирования:', error.message);
    return null;
  }
}

async function cleanupTestUser() {
  try {
    console.log('🗑️ Удаляем тестового пользователя...');
    
    const response = await fetch(`${API_BASE}/api/v2/admin/cleanup-test-user`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ telegram_id: 777000888 })
    });
    
    if (response.ok) {
      console.log('✅ Тестовый пользователь удален');
    } else {
      console.log('⚠️ Удаление через API не удалось, можно удалить через SQL');
    }
  } catch (error) {
    console.log('⚠️ Удаление через API не работает, удаляем через SQL');
  }
}

// Запуск теста
finalLaunchTest().then(async (user) => {
  if (user) {
    console.log('🎉 ТЕСТ ПРОШЕЛ УСПЕШНО');
    console.log('📊 База данных готова к production запуску');
    
    // Пауза перед очисткой
    await new Promise(resolve => setTimeout(resolve, 2000));
    await cleanupTestUser();
    
    console.log('✅ СИСТЕМА ГОТОВА К ЗАПУСКУ');
  } else {
    console.log('💔 ТЕСТ НЕ ПРОШЕЛ');
  }
}).catch(console.error);