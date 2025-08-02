import { supabase } from './core/supabaseClient';

async function checkAndCreateTestAccounts() {
  console.log('=== СОЗДАНИЕ ТЕСТОВЫХ АККАУНТОВ С TON BOOST ===\n');
  
  const REFERRER_ID = 184; // Ваш ID
  
  // Сначала проверим максимальный telegram_id
  const { data: maxIdData } = await supabase
    .from('users')
    .select('telegram_id')
    .order('telegram_id', { ascending: false })
    .limit(1);
    
  const maxTelegramId = maxIdData?.[0]?.telegram_id || 1000000;
  console.log(`Максимальный telegram_id: ${maxTelegramId}\n`);
  
  // Создаем 3 новых тестовых аккаунта с уникальными ID
  const baseId = Math.max(maxTelegramId + 1000, 9000000);
  const testAccounts = [
    {
      telegram_id: baseId + 1,
      username: `test_ton_boost_${Date.now()}_1`,
      first_name: 'Test TON 1',
      ton_deposit: 10, // 10 TON для покупки пакета
      boost_package: 1  // Starter Boost
    },
    {
      telegram_id: baseId + 2,
      username: `test_ton_boost_${Date.now()}_2`,
      first_name: 'Test TON 2',
      ton_deposit: 10,
      boost_package: 1
    },
    {
      telegram_id: baseId + 3,
      username: `test_ton_boost_${Date.now()}_3`,
      first_name: 'Test TON 3',
      ton_deposit: 10,
      boost_package: 1
    }
  ];
  
  console.log('1. СОЗДАНИЕ АККАУНТОВ:\n');
  const createdUserIds = [];
  
  for (const account of testAccounts) {
    try {
      // 1. Создаем пользователя
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          telegram_id: account.telegram_id,
          username: account.username,
          first_name: account.first_name,
          balance_uni: 0,
          balance_ton: account.ton_deposit, // Сразу даем TON для покупки
          ton_boost_package: account.boost_package,
          ton_farming_balance: account.ton_deposit,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (userError) {
        console.log(`❌ Ошибка создания ${account.username}: ${userError.message}`);
        continue;
      }
      
      console.log(`✅ Создан пользователь ${newUser.username} (ID: ${newUser.id}, TG: ${newUser.telegram_id})`);
      createdUserIds.push(newUser.id);
      
      // 2. Создаем партнерскую связь
      const { error: refError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: REFERRER_ID,
          referred_id: newUser.id,
          level: 1,
          created_at: new Date().toISOString()
        });
        
      if (!refError) {
        console.log(`   └── Привязан как реферал L1 к User ${REFERRER_ID}`);
      } else {
        console.log(`   └── Ошибка привязки: ${refError.message}`);
      }
      
      // 3. Записываем транзакцию пополнения TON
      await supabase
        .from('transactions')
        .insert({
          user_id: newUser.id,
          type: 'TON_DEPOSIT',
          amount: account.ton_deposit.toString(),
          currency: 'TON',
          status: 'completed',
          description: `Test TON deposit: ${account.ton_deposit} TON`,
          created_at: new Date().toISOString()
        });
      console.log(`   └── Добавлен депозит ${account.ton_deposit} TON`);
      
      // 4. Создаем запись в ton_farming_data
      const { error: farmingError } = await supabase
        .from('ton_farming_data')
        .insert({
          user_id: newUser.id,
          farming_balance: account.ton_deposit,
          boost_active: true, // ВАЖНО: активный статус!
          boost_package_id: account.boost_package,
          created_at: new Date().toISOString()
        });
        
      if (!farmingError) {
        console.log(`   └── ✅ TON farming активирован (boost_active: true)`);
      } else {
        console.log(`   └── Ошибка активации farming: ${farmingError.message}`);
      }
      
      // 5. Записываем транзакцию покупки Boost
      await supabase
        .from('transactions')
        .insert({
          user_id: newUser.id,
          type: 'BOOST_PURCHASE',
          amount: `-${account.ton_deposit}`, // Отрицательное значение
          currency: 'TON',
          status: 'completed',
          description: `Boost package ${account.boost_package} purchase`,
          created_at: new Date().toISOString()
        });
      console.log(`   └── Записана покупка Boost пакета\n`);
      
    } catch (error) {
      console.error(`Ошибка при создании ${account.username}:`, error);
    }
  }
  
  // Проверяем результат
  console.log('\n2. ПРОВЕРКА СОЗДАННЫХ АККАУНТОВ:');
  
  if (createdUserIds.length > 0) {
    const { data: newUsers } = await supabase
      .from('users')
      .select('id, username, ton_boost_package, ton_farming_balance, balance_ton')
      .in('id', createdUserIds);
      
    if (newUsers) {
      console.log(`\n✅ Успешно создано ${newUsers.length} новых рефералов:`);
      newUsers.forEach(user => {
        console.log(`\n├── ${user.username} (ID: ${user.id})`);
        console.log(`│   ├── TON Boost пакет: ${user.ton_boost_package}`);
        console.log(`│   ├── TON farming balance: ${user.ton_farming_balance} TON`);
        console.log(`│   └── Баланс TON: ${user.balance_ton} TON`);
      });
      
      // Проверяем статус в ton_farming_data
      const { data: farmingData } = await supabase
        .from('ton_farming_data')
        .select('user_id, boost_active, farming_balance')
        .in('user_id', createdUserIds);
        
      if (farmingData) {
        console.log('\n\nСтатус TON farming:');
        farmingData.forEach(data => {
          console.log(`├── User ${data.user_id}: boost_active = ${data.boost_active}, balance = ${data.farming_balance} TON`);
        });
      }
    }
  }
  
  console.log('\n\n✅ ГОТОВО! Эти аккаунты начнут генерировать TON farming rewards через 5 минут.');
  console.log('   Вы получите партнерские начисления после их первого farming reward.');
}

checkAndCreateTestAccounts();