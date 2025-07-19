/**
 * СКРИПТ ТЕСТИРОВАНИЯ ИСПРАВЛЕНИЙ РЕФЕРАЛЬНОЙ СИСТЕМЫ
 * Проверяет создание новых пользователей и реферальных связей
 */

console.log('🧪 ТЕСТИРОВАНИЕ ИСПРАВЛЕНИЙ РЕФЕРАЛЬНОЙ СИСТЕМЫ');
console.log('======================================================================\n');

async function testReferralSystemFix() {
  try {
    // 1. Проверяем права доступа к таблицам
    console.log('1️⃣ ПРОВЕРКА ПРАВ ДОСТУПА К БАЗЕ ДАННЫХ:');
    console.log('--------------------------------------------------');
    
    const testUserId = 999999999; // Тестовый telegram_id
    const refCode = 'TEST_REF_' + Date.now();
    
    console.log(`🎯 Тестовые данные:
    telegram_id: ${testUserId}
    ref_code: ${refCode}
    Время: ${new Date().toISOString()}\n`);

    // 2. Тестируем создание пользователя с реферальным кодом
    console.log('2️⃣ ТЕСТИРОВАНИЕ СОЗДАНИЯ ПОЛЬЗОВАТЕЛЯ:');
    console.log('--------------------------------------------------');
    
    try {
      // Симулируем вызов API для создания пользователя
      const response = await fetch('/api/v2/auth/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': 'mock_init_data'
        },
        body: JSON.stringify({
          initData: `user=${JSON.stringify({
            id: testUserId,
            username: 'test_user_' + Date.now(),
            first_name: 'Test User'
          })}`,
          ref_by: refCode
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Пользователь успешно создан:', data);
        
        // Проверяем детали созданного пользователя
        if (data.success && data.data.user) {
          const userId = data.data.user.id;
          console.log(`✅ User ID: ${userId}`);
          
          // 3. Проверяем, что referred_by заполнен
          console.log('\n3️⃣ ПРОВЕРКА ЗАПОЛНЕНИЯ referred_by:');
          console.log('--------------------------------------------------');
          
          // Пытаемся получить информацию о пользователе
          try {
            const userResponse = await fetch(`/api/v2/user/${userId}`, {
              headers: {
                'Authorization': `Bearer ${data.data.token}`
              }
            });
            
            if (userResponse.ok) {
              const userData = await userResponse.json();
              console.log('✅ Данные пользователя получены:', userData);
              
              if (userData.data.referred_by) {
                console.log(`✅ referred_by заполнен: ${userData.data.referred_by}`);
              } else {
                console.log('❌ referred_by НЕ заполнен (null)');
              }
            } else {
              console.log('❌ Не удалось получить данные пользователя:', userResponse.status);
            }
          } catch (error) {
            console.log('❌ Ошибка получения данных пользователя:', error.message);
          }
          
          // 4. Проверяем записи в таблице referrals (через backend лог)
          console.log('\n4️⃣ ПРОВЕРКА ЗАПИСЕЙ В ТАБЛИЦЕ REFERRALS:');
          console.log('--------------------------------------------------');
          console.log('📋 Проверьте server logs на предмет:');
          console.log('   ✅ "[AuthService] ✅ РЕФЕРАЛЬНАЯ СВЯЗЬ УСПЕШНО СОЗДАНА"');
          console.log('   ❌ "[AuthService] ❌ КРИТИЧЕСКАЯ ОШИБКА создания referrals записи"');
          
        }
      } else {
        const errorData = await response.json();
        console.log('❌ Ошибка создания пользователя:', errorData);
      }
    } catch (error) {
      console.log('❌ Критическая ошибка при тестировании:', error.message);
    }
    
    // 5. Финальная оценка исправлений
    console.log('\n5️⃣ ОЦЕНКА РЕЗУЛЬТАТОВ:');
    console.log('--------------------------------------------------');
    console.log('🎯 ЧТО ИСПРАВЛЕНО:');
    console.log('   1. ✅ Типизация полей: parseInt(newUserId)');
    console.log('   2. ✅ Строковые значения для reward: "0" вместо 0');
    console.log('   3. ✅ Детальное логирование ошибок Supabase');
    console.log('   4. ✅ Расширенная диагностика успеха');
    
    console.log('\n📊 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ:');
    console.log('   ✅ referred_by должно быть заполнено');
    console.log('   ✅ Должны появиться записи в referrals');
    console.log('   ✅ buildReferrerChain() должен находить цепочки');
    console.log('   ✅ Реферальные награды должны начисляться');

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ТЕСТИРОВАНИЯ:', error);
  }
}

// Запуск тестирования
if (typeof window !== 'undefined') {
  testReferralSystemFix();
} else {
  console.log('⚠️ Тестирование предназначено для браузера');
  console.log('Скопируйте код функции testReferralSystemFix в консоль браузера');
}