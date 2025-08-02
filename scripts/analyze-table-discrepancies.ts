import { supabase } from '../core/supabase.js';

async function analyzeTableDiscrepancies() {
  console.log('🔍 ДЕТАЛЬНЫЙ АНАЛИЗ РАСХОЖДЕНИЙ МЕЖДУ ТАБЛИЦАМИ');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Анализ UNI данных
    console.log('📊 UNI FARMING АНАЛИЗ:\n');

    // Пользователи с UNI депозитами в users
    const { data: usersWithUni } = await supabase
      .from('users')
      .select('id, balance_uni, uni_deposit_amount, uni_farming_active, uni_farming_balance')
      .gt('uni_deposit_amount', 0)
      .order('id');

    // Все записи из uni_farming_data
    const { data: uniFarmingRecords } = await supabase
      .from('uni_farming_data')
      .select('*')
      .order('user_id');

    console.log(`Пользователей с UNI депозитами (users): ${usersWithUni?.length || 0}`);
    console.log(`Записей в uni_farming_data: ${uniFarmingRecords?.length || 0}`);
    console.log('');

    // Найти пользователей которые есть в uni_farming_data но нет в users
    if (usersWithUni && uniFarmingRecords) {
      const userIds = new Set(usersWithUni.map(u => u.id));
      const farmingUserIds = new Set(uniFarmingRecords.map(f => f.user_id));
      
      const onlyInFarming = [...farmingUserIds].filter(id => !userIds.has(id));
      const onlyInUsers = [...userIds].filter(id => !farmingUserIds.has(id));

      if (onlyInFarming.length > 0) {
        console.log(`⚠️  Пользователи ТОЛЬКО в uni_farming_data: ${onlyInFarming.join(', ')}`);
        
        // Проверим есть ли эти пользователи вообще в users
        const { data: checkUsers } = await supabase
          .from('users')
          .select('id, uni_deposit_amount')
          .in('id', onlyInFarming);
        
        if (checkUsers) {
          console.log('   Детали:');
          checkUsers.forEach(u => {
            console.log(`   - User ${u.id}: uni_deposit_amount = ${u.uni_deposit_amount}`);
          });
        }
        console.log('');
      }

      if (onlyInUsers.length > 0) {
        console.log(`⚠️  Пользователи ТОЛЬКО в users (с депозитами): ${onlyInUsers.join(', ')}`);
        console.log('');
      }

      // Анализ расхождений в данных
      console.log('📋 Расхождения в данных:');
      let discrepancyCount = 0;
      
      uniFarmingRecords.forEach(farming => {
        const user = usersWithUni.find(u => u.id === farming.user_id);
        if (user) {
          const issues = [];
          
          if (user.balance_uni !== farming.balance) {
            issues.push(`balance: ${farming.balance} vs ${user.balance_uni}`);
          }
          if (user.uni_deposit_amount !== farming.deposit_amount) {
            issues.push(`deposit: ${farming.deposit_amount} vs ${user.uni_deposit_amount}`);
          }
          if (user.uni_farming_active !== farming.is_active) {
            issues.push(`active: ${farming.is_active} vs ${user.uni_farming_active}`);
          }
          if (user.uni_farming_balance !== farming.farming_balance) {
            issues.push(`farming_balance: ${farming.farming_balance} vs ${user.uni_farming_balance}`);
          }
          
          if (issues.length > 0) {
            discrepancyCount++;
            if (discrepancyCount <= 5) {
              console.log(`   User ${user.id}: ${issues.join(', ')}`);
            }
          }
        }
      });
      
      if (discrepancyCount > 5) {
        console.log(`   ... и еще ${discrepancyCount - 5} расхождений`);
      }
      console.log('');
    }

    // 2. Анализ TON данных
    console.log('\n📊 TON FARMING АНАЛИЗ:\n');

    // Пользователи с TON кошельками
    const { data: usersWithTon } = await supabase
      .from('users')
      .select('id, ton_wallet_address, ton_farming_balance, ton_boost_package')
      .not('ton_wallet_address', 'is', null)
      .order('id');

    // Все записи из ton_farming_data
    const { data: tonFarmingRecords } = await supabase
      .from('ton_farming_data')
      .select('*')
      .order('user_id');

    console.log(`Пользователей с TON кошельками (users): ${usersWithTon?.length || 0}`);
    console.log(`Записей в ton_farming_data: ${tonFarmingRecords?.length || 0}`);
    console.log('');

    if (usersWithTon && tonFarmingRecords) {
      const tonUserIds = new Set(usersWithTon.map(u => u.id));
      const tonFarmingIds = new Set(tonFarmingRecords.map(f => f.user_id));
      
      const onlyInTonFarming = [...tonFarmingIds].filter(id => !tonUserIds.has(id));
      const onlyInTonUsers = [...tonUserIds].filter(id => !tonFarmingIds.has(id));

      if (onlyInTonFarming.length > 0) {
        console.log(`⚠️  Пользователи ТОЛЬКО в ton_farming_data: ${onlyInTonFarming.join(', ')}`);
        console.log('');
      }

      if (onlyInTonUsers.length > 0) {
        console.log(`⚠️  Пользователи ТОЛЬКО в users (с кошельками): ${onlyInTonUsers.length} пользователей`);
        console.log(`   IDs: ${onlyInTonUsers.slice(0, 10).join(', ')}${onlyInTonUsers.length > 10 ? '...' : ''}`);
        console.log('');
      }
    }

    // 3. Анализ источников данных
    console.log('\n🔗 АНАЛИЗ ИСТОЧНИКОВ ДАННЫХ:\n');

    // Проверим какие API используют эти таблицы
    console.log('Таблица USERS используется:');
    console.log('- /api/v2/balance - основной баланс');
    console.log('- /api/v2/uni-farming/* - UNI фарминг операции');
    console.log('- /api/v2/ton-boost/* - TON boost операции');
    console.log('- Schedulers для обновления балансов');
    console.log('');

    console.log('Таблица UNI_FARMING_DATA используется:');
    console.log('- UniFarmingRepository (старый код)');
    console.log('- Возможно, старые версии API');
    console.log('');

    console.log('Таблица TON_FARMING_DATA используется:');
    console.log('- TonFarmingRepository (старый код)');
    console.log('- Возможно, старые версии API');
    console.log('');

    // 4. Рекомендации по синхронизации
    console.log('\n✅ РЕКОМЕНДАЦИИ ПО СИНХРОНИЗАЦИИ:\n');

    console.log('1. НЕМЕДЛЕННЫЕ ДЕЙСТВИЯ:');
    console.log('   - Создать скрипт миграции данных из farming_data таблиц в users');
    console.log('   - Добавить триггеры для автоматической синхронизации');
    console.log('   - Логировать все операции записи для отслеживания');
    console.log('');

    console.log('2. АРХИТЕКТУРНОЕ РЕШЕНИЕ:');
    console.log('   📌 Таблица USERS должна быть единственным источником истины');
    console.log('   📌 farming_data таблицы использовать только для чтения (legacy)');
    console.log('   📌 Все записи делать только в users');
    console.log('   📌 Использовать views для обратной совместимости');
    console.log('');

    console.log('3. ПЛАН МИГРАЦИИ:');
    console.log('   Фаза 1: Синхронизация данных (выполнено частично)');
    console.log('   Фаза 2: Создание триггеров и views');
    console.log('   Фаза 3: Обновление кода для записи только в users');
    console.log('   Фаза 4: Перевод чтения на users');
    console.log('   Фаза 5: Архивация farming_data таблиц');

  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  }
}

// Запуск анализа
console.log('Запуск детального анализа расхождений...\n');
analyzeTableDiscrepancies();