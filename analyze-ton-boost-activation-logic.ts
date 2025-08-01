import { supabase } from './core/supabaseClient';

async function analyzeTonBoostActivationLogic() {
  console.log('🔍 АНАЛИЗ ЛОГИКИ АКТИВАЦИИ TON BOOST');
  console.log('='.repeat(60));

  try {
    // 1. Находим проблемные аккаунты с TON балансом но без активного Boost
    console.log('\n1️⃣ ПРОБЛЕМНЫЕ АККАУНТЫ (TON БАЛАНС БЕЗ BOOST):');
    
    const { data: problematicUsers, error: problemError } = await supabase
      .from('users')
      .select('*')
      .gt('balance_ton', 0)
      .eq('ton_boost_active', false)
      .order('id', { ascending: true });

    if (!problemError && problematicUsers) {
      console.log(`❌ Проблемных аккаунтов: ${problematicUsers.length}`);
      
      problematicUsers.forEach((user, idx) => {
        if (idx < 10) { // Показываем первые 10
          console.log(`   User ${user.id}:`);
          console.log(`     TON Balance: ${user.balance_ton}`);
          console.log(`     TON Boost Active: ${user.ton_boost_active}`);
          console.log(`     Создан: ${user.created_at}`);
          console.log(`     Wallet: ${user.ton_wallet_address || 'НЕТ'}`);
          console.log('     ---');
        }
      });

      // Проверяем есть ли записи в ton_farming_data для проблемных пользователей
      console.log('\n🌾 ПРОВЕРКА TON_FARMING_DATA для проблемных аккаунтов:');
      for (const user of problematicUsers.slice(0, 5)) {
        const { data: farmingData, error: farmingError } = await supabase
          .from('ton_farming_data')
          .select('*')
          .eq('user_id', user.id);

        if (!farmingError) {
          if (farmingData && farmingData.length > 0) {
            farmingData.forEach(farm => {
              console.log(`   User ${user.id}: farming_balance=${farm.farming_balance}, boost_active=${farm.boost_active}`);
            });
          } else {
            console.log(`   User ${user.id}: ❌ НЕТ ЗАПИСИ в ton_farming_data`);
          }
        }
      }
    }

    // 2. Анализируем успешные аккаунты
    console.log('\n2️⃣ УСПЕШНЫЕ АККАУНТЫ (TON БАЛАНС И АКТИВНЫЙ BOOST):');
    
    const { data: successfulUsers, error: successError } = await supabase
      .from('users')
      .select('*')
      .gt('balance_ton', 0)
      .eq('ton_boost_active', true)
      .order('id', { ascending: true })
      .limit(10);

    if (!successError && successfulUsers) {
      console.log(`✅ Успешных аккаунтов: ${successfulUsers.length}`);
      
      successfulUsers.forEach((user, idx) => {
        if (idx < 5) {
          console.log(`   User ${user.id}:`);
          console.log(`     TON Balance: ${user.balance_ton}`);
          console.log(`     TON Boost Active: ${user.ton_boost_active}`);
          console.log(`     Создан: ${user.created_at}`);
          console.log(`     Wallet: ${user.ton_wallet_address || 'НЕТ'}`);
          console.log('     ---');
        }
      });

      // Проверяем ton_farming_data для успешных пользователей
      console.log('\n🌾 TON_FARMING_DATA для успешных аккаунтов:');
      for (const user of successfulUsers.slice(0, 3)) {
        const { data: farmingData, error: farmingError } = await supabase
          .from('ton_farming_data')
          .select('*')
          .eq('user_id', user.id);

        if (!farmingError && farmingData && farmingData.length > 0) {
          farmingData.forEach(farm => {
            console.log(`   User ${user.id}: farming_balance=${farm.farming_balance}, boost_active=${farm.boost_active}, package=${farm.boost_package_id}`);
          });
        }
      }
    }

    // 3. Сравнение данных между проблемными и успешными аккаунтами
    console.log('\n3️⃣ СРАВНИТЕЛЬНЫЙ АНАЛИЗ:');
    
    if (problematicUsers && successfulUsers) {
      console.log('\n📊 СТАТИСТИЧЕСКИЕ РАЗЛИЧИЯ:');
      
      // Анализ по датам создания
      const problemDates = problematicUsers.map(u => new Date(u.created_at));
      const successDates = successfulUsers.map(u => new Date(u.created_at));
      
      const problemMinDate = Math.min(...problemDates.map(d => d.getTime()));
      const problemMaxDate = Math.max(...problemDates.map(d => d.getTime()));
      const successMinDate = Math.min(...successDates.map(d => d.getTime()));
      const successMaxDate = Math.max(...successDates.map(d => d.getTime()));
      
      console.log(`   Проблемные аккаунты созданы: ${new Date(problemMinDate).toISOString().split('T')[0]} - ${new Date(problemMaxDate).toISOString().split('T')[0]}`);
      console.log(`   Успешные аккаунты созданы: ${new Date(successMinDate).toISOString().split('T')[0]} - ${new Date(successMaxDate).toISOString().split('T')[0]}`);
      
      // Анализ ID диапазонов
      const problemIds = problematicUsers.map(u => u.id);
      const successIds = successfulUsers.map(u => u.id);
      
      console.log(`   Проблемные ID диапазон: ${Math.min(...problemIds)} - ${Math.max(...problemIds)}`);
      console.log(`   Успешные ID диапазон: ${Math.min(...successIds)} - ${Math.max(...successIds)}`);
      
      // Анализ кошельков
      const problemWithWallet = problematicUsers.filter(u => u.ton_wallet_address).length;
      const successWithWallet = successfulUsers.filter(u => u.ton_wallet_address).length;
      
      console.log(`   Проблемные с кошельком: ${problemWithWallet}/${problematicUsers.length} (${Math.round(problemWithWallet/problematicUsers.length*100)}%)`);
      console.log(`   Успешные с кошельком: ${successWithWallet}/${successfulUsers.length} (${Math.round(successWithWallet/successfulUsers.length*100)}%)`);
    }

    // 4. Анализ синхронизации между users и ton_farming_data
    console.log('\n4️⃣ АНАЛИЗ СИНХРОНИЗАЦИИ ТАБЛИЦ:');
    
    // Проверяем расхождения между users.ton_boost_active и ton_farming_data.boost_active
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('id, ton_boost_active')
      .gt('balance_ton', 0);

    const { data: allFarmingData, error: allFarmingError } = await supabase
      .from('ton_farming_data')
      .select('user_id, boost_active');

    if (!allUsersError && !allFarmingError && allUsers && allFarmingData) {
      console.log('\n🔄 ПРОВЕРКА СИНХРОНИЗАЦИИ:');
      
      let syncErrors = 0;
      let missingFarmingData = 0;
      
      for (const user of allUsers) {
        const farmingRecord = allFarmingData.find(f => f.user_id === user.id);
        
        if (!farmingRecord) {
          missingFarmingData++;
          console.log(`   ❌ User ${user.id}: НЕТ записи в ton_farming_data`);
        } else if (user.ton_boost_active !== farmingRecord.boost_active) {
          syncErrors++;
          console.log(`   ⚠️ User ${user.id}: users.ton_boost_active=${user.ton_boost_active}, farming.boost_active=${farmingRecord.boost_active}`);
        }
      }
      
      console.log(`\n📈 РЕЗУЛЬТАТЫ СИНХРОНИЗАЦИИ:`);
      console.log(`   Пользователей с TON балансом: ${allUsers.length}`);
      console.log(`   Без записи в ton_farming_data: ${missingFarmingData}`);
      console.log(`   Ошибок синхронизации: ${syncErrors}`);
    }

    // 5. Анализ последовательности активации
    console.log('\n5️⃣ АНАЛИЗ ПОСЛЕДОВАТЕЛЬНОСТИ АКТИВАЦИИ:');
    
    // Ищем паттерны в том, когда активируется TON Boost
    const { data: recentActivations, error: activationError } = await supabase
      .from('ton_farming_data')
      .select('user_id, boost_active, farming_balance, created_at')
      .eq('boost_active', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!activationError && recentActivations) {
      console.log(`⚡ Последние активации TON Boost: ${recentActivations.length}`);
      
      recentActivations.slice(0, 10).forEach((activation, idx) => {
        console.log(`   ${idx + 1}. User ${activation.user_id}: ${activation.farming_balance} TON, активирован ${activation.created_at}`);
      });
    }

    // 6. Итоговый диагноз причин неодинакового поведения
    console.log('\n6️⃣ ДИАГНОЗ ПРИЧИН НЕОДИНАКОВОГО ПОВЕДЕНИЯ:');
    
    console.log('\n🎯 ВЫЯВЛЕННЫЕ ПРОБЛЕМЫ:');
    console.log('   1. ОТСУТСТВИЕ ЗАПИСЕЙ: Некоторые пользователи с TON балансом не имеют записей в ton_farming_data');
    console.log('   2. РАССИНХРОНИЗАЦИЯ: Различия между users.ton_boost_active и ton_farming_data.boost_active');
    console.log('   3. НЕПОЛНАЯ АКТИВАЦИЯ: TON списывается, но boost не активируется');
    
    console.log('\n💡 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
    console.log('   1. Ошибки в API обработке депозитов - не все шаги выполняются');
    console.log('   2. Проблемы с транзакциями - rollback после ошибки');
    console.log('   3. Временные сбои сервера во время обработки');
    console.log('   4. Различия в обработке для разных версий API');
    console.log('   5. Проблемы с scheduler\'ами активации');
    
    console.log('\n🔧 РЕКОМЕНДУЕМЫЕ ДЕЙСТВИЯ:');
    console.log('   1. Проверить логи API endpoint /api/v2/wallet/ton-deposit');
    console.log('   2. Найти неполные транзакции в базе данных');
    console.log('   3. Восстановить отсутствующие записи в ton_farming_data');
    console.log('   4. Синхронизировать флаги boost_active между таблицами');
    console.log('   5. Добавить валидацию целостности данных');

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА АНАЛИЗА:', error);
  }
}

analyzeTonBoostActivationLogic().catch(console.error);