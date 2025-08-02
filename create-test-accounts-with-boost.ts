import { supabase } from './core/supabaseClient';

async function createTestAccountsWithBoost() {
  console.log('=== СОЗДАНИЕ ТЕСТОВЫХ АККАУНТОВ С TON BOOST ===\n');
  
  const REFERRER_ID = 184; // Ваш ID
  const REFERRER_CODE = 'REF_1752755835358_yjrusv'; // Ваш партнерский код
  
  // Создаем 3 новых тестовых аккаунта
  const testAccounts = [
    {
      telegram_id: 900001,
      username: 'test_ton_boost_1',
      first_name: 'Test TON 1',
      ton_deposit: 10, // 10 TON для покупки пакета
      boost_package: 1  // Starter Boost
    },
    {
      telegram_id: 900002,
      username: 'test_ton_boost_2',
      first_name: 'Test TON 2',
      ton_deposit: 10,
      boost_package: 1
    },
    {
      telegram_id: 900003,
      username: 'test_ton_boost_3',
      first_name: 'Test TON 3',
      ton_deposit: 10,
      boost_package: 1
    }
  ];
  
  console.log('1. СОЗДАНИЕ АККАУНТОВ:\n');
  
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
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (userError) {
        console.log(`❌ Ошибка создания ${account.username}: ${userError.message}`);
        continue;
      }
      
      console.log(`✅ Создан пользователь ${newUser.username} (ID: ${newUser.id})`);
      
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
      }
      
      // 3. Записываем транзакцию пополнения TON
      const { error: depositError } = await supabase
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
        
      if (!depositError) {
        console.log(`   └── Добавлен депозит ${account.ton_deposit} TON`);
      }
      
      // 4. Активируем TON Boost пакет
      const { error: boostError } = await supabase
        .from('users')
        .update({
          ton_boost_package: account.boost_package,
          ton_farming_balance: account.ton_deposit // Весь депозит идет в farming
        })
        .eq('id', newUser.id);
        
      if (!boostError) {
        console.log(`   └── Активирован Boost пакет ${account.boost_package}`);
      }
      
      // 5. Создаем запись в ton_farming_data
      const { error: farmingError } = await supabase
        .from('ton_farming_data')
        .insert({
          user_id: newUser.id,
          farming_balance: account.ton_deposit,
          boost_active: true, // ВАЖНО: активный статус!
          boost_package_id: account.boost_package,
          daily_rate: 1.0, // 1% для пакета 1
          created_at: new Date().toISOString()
        });
        
      if (!farmingError) {
        console.log(`   └── ✅ TON farming активирован (boost_active: true)`);
      }
      
      // 6. Записываем транзакцию покупки Boost
      const { error: purchaseError } = await supabase
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
        
      if (!purchaseError) {
        console.log(`   └── Записана покупка Boost пакета\n`);
      }
      
    } catch (error) {
      console.error(`Ошибка при создании ${account.username}:`, error);
    }
  }
  
  // Проверяем результат
  console.log('\n2. ПРОВЕРКА СОЗДАННЫХ АККАУНТОВ:');
  
  const { data: newReferrals } = await supabase
    .from('referrals')
    .select(`
      referred_id,
      users!referrals_referred_id_fkey (
        id,
        username,
        ton_boost_package,
        ton_farming_balance,
        balance_ton
      )
    `)
    .eq('referrer_id', REFERRER_ID)
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Последние 5 минут
    
  if (newReferrals && newReferrals.length > 0) {
    console.log(`\n✅ Успешно создано ${newReferrals.length} новых рефералов для User ${REFERRER_ID}:`);
    newReferrals.forEach((ref: any) => {
      const user = ref.users;
      console.log(`\n├── ${user.username} (ID: ${user.id})`);
      console.log(`│   ├── TON Boost пакет: ${user.ton_boost_package}`);
      console.log(`│   ├── TON farming balance: ${user.ton_farming_balance} TON`);
      console.log(`│   └── Баланс TON: ${user.balance_ton} TON`);
    });
  }
  
  console.log('\n\n✅ ГОТОВО! Теперь эти аккаунты должны начать генерировать TON farming rewards.');
  console.log('   Партнерские начисления появятся через несколько минут после первого farming reward.');
}

createTestAccountsWithBoost();