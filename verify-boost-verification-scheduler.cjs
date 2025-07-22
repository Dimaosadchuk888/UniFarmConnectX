/**
 * Диагностический скрипт проверки BoostVerificationScheduler
 * Проверяет работу автоматической верификации TON Boost платежей
 */

const { createClient } = require('@supabase/supabase-js');

async function verifyBoostScheduler() {
  console.log('🔍 ПРОВЕРКА BOOST VERIFICATION SCHEDULER\n' + '='.repeat(50));

  try {
    // Инициализация Supabase
    const supabase = createClient(
      'https://wunnsvicbebssrjqedor.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bm5zdmljYmVic3NyanFlZG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA2MjM0OTcsImV4cCI6MjAzNjE5OTQ5N30.MpJzrWFiOkjOl-nCGwkAfBs4kBnRIf-Kf_t9-5dPJW8'
    );

    console.log('✅ Supabase клиент инициализирован\n');

    // 1. СТАТИСТИКА PENDING BOOST ПОКУПОК
    console.log('1. СТАТИСТИКА PENDING BOOST ПОКУПОК:');
    
    const { data: pendingPurchases, error: pendingError } = await supabase
      .from('boost_purchases')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (pendingError) {
      console.log(`❌ Ошибка получения pending покупок: ${pendingError.message}`);
      return;
    }

    console.log(`   ├── Всего pending покупок: ${pendingPurchases?.length || 0}`);

    if (pendingPurchases && pendingPurchases.length > 0) {
      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const readyForVerification = pendingPurchases.filter(p => 
        new Date(p.created_at) < twoMinutesAgo
      ).length;
      
      const recent = pendingPurchases.filter(p => 
        new Date(p.created_at) > twoMinutesAgo
      ).length;
      
      const expired = pendingPurchases.filter(p => 
        new Date(p.created_at) < twentyFourHoursAgo
      ).length;

      console.log(`   ├── Готовы к верификации (>2 мин): ${readyForVerification}`);
      console.log(`   ├── Недавние (<2 мин): ${recent}`);
      console.log(`   ├── Expired (>24 ч): ${expired}`);

      // Показываем последние 3 pending записи
      console.log('\n   📋 Последние pending покупки:');
      pendingPurchases.slice(0, 3).forEach((purchase, index) => {
        const createdAt = new Date(purchase.created_at);
        const ageMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
        
        console.log(`      ${index + 1}. ID: ${purchase.id}, User: ${purchase.user_id}, Boost: ${purchase.boost_id}`);
        console.log(`         ├── Создана: ${ageMinutes} минут назад`);
        console.log(`         ├── TX Hash: ${purchase.tx_hash ? purchase.tx_hash.substring(0, 16) + '...' : 'NULL'}`);
        console.log(`         └── Amount: ${purchase.amount || 'NULL'} TON`);
      });
    }

    // 2. СТАТИСТИКА CONFIRMED ПОКУПОК
    console.log('\n2. СТАТИСТИКА CONFIRMED ПОКУПОК:');
    
    const { data: confirmedPurchases, error: confirmedError } = await supabase
      .from('boost_purchases')
      .select('*')
      .eq('status', 'confirmed')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (confirmedError) {
      console.log(`❌ Ошибка получения confirmed покупок: ${confirmedError.message}`);
    } else {
      console.log(`   ├── Всего confirmed покупок: ${confirmedPurchases?.length || 0} (показано последние 5)`);
      
      if (confirmedPurchases && confirmedPurchases.length > 0) {
        console.log('\n   📋 Последние confirmed покупки:');
        confirmedPurchases.forEach((purchase, index) => {
          const updatedAt = new Date(purchase.updated_at);
          const ageMinutes = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60));
          
          console.log(`      ${index + 1}. ID: ${purchase.id}, User: ${purchase.user_id}, Boost: ${purchase.boost_id}`);
          console.log(`         ├── Подтверждена: ${ageMinutes} минут назад`);
          console.log(`         └── Amount: ${purchase.amount || 'NULL'} TON`);
        });
      }
    }

    // 3. ПРОВЕРКА АКТИВНЫХ BOOST ПАКЕТОВ
    console.log('\n3. АКТИВНЫЕ TON BOOST ПАКЕТЫ:');
    
    const { data: activeUsers, error: usersError } = await supabase
      .from('users')
      .select('id, telegram_id, username, ton_boost_package, ton_boost_rate')
      .not('ton_boost_package', 'is', null)
      .limit(5);

    if (usersError) {
      console.log(`❌ Ошибка получения пользователей с boost: ${usersError.message}`);
    } else {
      console.log(`   ├── Пользователей с активными boost: ${activeUsers?.length || 0}`);
      
      if (activeUsers && activeUsers.length > 0) {
        console.log('\n   📋 Пользователи с активными boost:');
        activeUsers.forEach((user, index) => {
          console.log(`      ${index + 1}. User ${user.id} (@${user.username || 'no_username'})`);
          console.log(`         ├── Boost Package: ${user.ton_boost_package}`);
          console.log(`         └── Daily Rate: ${user.ton_boost_rate}%`);
        });
      }
    }

    // 4. ПРОВЕРКА API ENDPOINT
    console.log('\n4. ПРОВЕРКА ДИАГНОСТИЧЕСКОГО API:');
    
    try {
      const response = await fetch('http://localhost:3000/api/v2/boost/pending-status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('   ✅ API endpoint /api/v2/boost/pending-status работает');
        console.log(`   ├── Статус: ${response.status}`);
        console.log(`   ├── Response: ${JSON.stringify(result, null, 2)}`);
      } else {
        console.log(`   ❌ API endpoint недоступен: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.log(`   └── Error: ${errorText.substring(0, 200)}`);
      }
    } catch (apiError) {
      console.log(`   ❌ Ошибка вызова API: ${apiError.message}`);
    }

    // 5. ИТОГОВОЕ ЗАКЛЮЧЕНИЕ
    console.log('\n5. ИТОГОВОЕ ЗАКЛЮЧЕНИЕ:');
    
    const totalPending = pendingPurchases?.length || 0;
    const totalConfirmed = confirmedPurchases?.length || 0;
    const totalActiveUsers = activeUsers?.length || 0;

    console.log(`   ├── Система автоматической верификации: ${totalPending === 0 ? '✅ РАБОТАЕТ' : '⚠️ ЕСТЬ PENDING'}`);
    console.log(`   ├── Pending покупок для обработки: ${totalPending}`);
    console.log(`   ├── Успешных активаций: ${totalConfirmed}`);
    console.log(`   ├── Активных boost пользователей: ${totalActiveUsers}`);
    
    if (totalPending === 0) {
      console.log('   └── 🎉 ВСЕ ПЛАТЕЖИ ОБРАБОТАНЫ - система работает автономно!');
    } else {
      console.log('   └── ⏳ Ожидание автоматической обработки pending платежей...');
    }

  } catch (error) {
    console.log(`❌ Критическая ошибка: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
  }
}

// Запуск диагностики
verifyBoostScheduler().catch(console.error);