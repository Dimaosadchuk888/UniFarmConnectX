import { supabase } from '../core/supabase.js';

async function migrateToUsersTable() {
  console.log('🚀 НАЧИНАЕМ МИГРАЦИЮ ДАННЫХ В ТАБЛИЦУ USERS');
  console.log('='.repeat(80));
  console.log('');

  const results = {
    created_users: 0,
    updated_deposits: 0,
    updated_boosts: 0,
    errors: []
  };

  try {
    // 1. СОЗДАНИЕ НЕДОСТАЮЩИХ ПОЛЬЗОВАТЕЛЕЙ
    console.log('📝 ШАГ 1: СОЗДАНИЕ НЕДОСТАЮЩИХ ПОЛЬЗОВАТЕЛЕЙ\n');

    // Получаем всех пользователей из uni_farming_data
    const { data: uniFarmingUsers } = await supabase
      .from('uni_farming_data')
      .select('*')
      .order('user_id');

    // Получаем существующих пользователей
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id')
      .order('id');

    const existingIds = new Set(existingUsers?.map(u => u.id) || []);

    // Создаем недостающих пользователей
    for (const farming of uniFarmingUsers || []) {
      if (!existingIds.has(farming.user_id)) {
        console.log(`Создаем пользователя ${farming.user_id}...`);
        
        // Проверяем корректность данных
        const depositAmount = isNaN(farming.deposit_amount) ? 0 : farming.deposit_amount;
        
        const { error } = await supabase
          .from('users')
          .insert({
            id: farming.user_id,
            telegram_id: farming.user_id, // Используем user_id как telegram_id
            username: `legacy_user_${farming.user_id}`,
            uni_deposit_amount: depositAmount,
            uni_farming_balance: farming.farming_balance || 0,
            uni_farming_active: farming.is_active || false,
            balance_uni: farming.farming_balance || 0,
            created_at: farming.created_at || new Date().toISOString()
          });

        if (error) {
          console.error(`❌ Ошибка создания user ${farming.user_id}:`, error);
          results.errors.push({ user_id: farming.user_id, error: error.message });
        } else {
          console.log(`✅ User ${farming.user_id} создан (deposit: ${depositAmount} UNI)`);
          results.created_users++;
        }
      }
    }

    console.log(`\n✅ Создано ${results.created_users} новых пользователей`);

    // 2. СИНХРОНИЗАЦИЯ ДЕПОЗИТОВ
    console.log('\n\n📝 ШАГ 2: СИНХРОНИЗАЦИЯ ДЕПОЗИТОВ\n');

    // Проверяем пользователей с депозитами в старой таблице
    const { data: depositsToSync } = await supabase
      .from('uni_farming_data')
      .select('user_id, deposit_amount, farming_balance')
      .gt('deposit_amount', 0)
      .order('user_id');

    for (const deposit of depositsToSync || []) {
      // Получаем текущие данные из users
      const { data: currentUser } = await supabase
        .from('users')
        .select('uni_deposit_amount')
        .eq('id', deposit.user_id)
        .single();

      if (currentUser && currentUser.uni_deposit_amount === 0) {
        console.log(`Обновляем депозит для user ${deposit.user_id}: ${deposit.deposit_amount} UNI`);
        
        const { error } = await supabase
          .from('users')
          .update({
            uni_deposit_amount: deposit.deposit_amount,
            uni_farming_balance: deposit.farming_balance || 0,
            balance_uni: deposit.farming_balance || 0
          })
          .eq('id', deposit.user_id);

        if (error) {
          console.error(`❌ Ошибка обновления депозита user ${deposit.user_id}:`, error);
          results.errors.push({ user_id: deposit.user_id, error: error.message });
        } else {
          console.log(`✅ Депозит обновлен`);
          results.updated_deposits++;
        }
      }
    }

    console.log(`\n✅ Обновлено ${results.updated_deposits} депозитов`);

    // 3. СИНХРОНИЗАЦИЯ TON BOOST PACKAGES
    console.log('\n\n📝 ШАГ 3: СИНХРОНИЗАЦИЯ TON BOOST PACKAGES\n');

    const { data: tonBoosts } = await supabase
      .from('ton_farming_data')
      .select('user_id, boost_package_id, farming_balance')
      .not('boost_package_id', 'is', null)
      .order('user_id');

    for (const boost of tonBoosts || []) {
      console.log(`Обновляем boost package для user ${boost.user_id}: пакет ${boost.boost_package_id}`);
      
      const { error } = await supabase
        .from('users')
        .update({
          ton_boost_package: boost.boost_package_id,
          ton_farming_balance: boost.farming_balance || 0
        })
        .eq('id', boost.user_id);

      if (error) {
        console.error(`❌ Ошибка обновления boost user ${boost.user_id}:`, error);
        results.errors.push({ user_id: boost.user_id, error: error.message });
      } else {
        console.log(`✅ Boost package обновлен`);
        results.updated_boosts++;
      }
    }

    console.log(`\n✅ Обновлено ${results.updated_boosts} boost packages`);

    // 4. СОЗДАНИЕ SQL VIEWS
    console.log('\n\n📝 ШАГ 4: СОЗДАНИЕ SQL VIEWS ДЛЯ СОВМЕСТИМОСТИ\n');

    // Сначала удаляем старые таблицы (переименовываем их)
    console.log('Архивируем старые таблицы...');
    
    // Архивируем старые таблицы (переименование будет сделано через SQL)
    console.log('Старые таблицы будут архивированы после создания Views');

    // Создаем Views
    const viewsSQL = `
-- Сначала архивируем старые таблицы
ALTER TABLE uni_farming_data RENAME TO _archived_uni_farming_data_2025_08_02;
ALTER TABLE ton_farming_data RENAME TO _archived_ton_farming_data_2025_08_02;

-- View для uni_farming_data
CREATE OR REPLACE VIEW uni_farming_data AS
SELECT 
  gen_random_uuid() as id,
  id as user_id,
  uni_deposit_amount as deposit_amount,
  uni_farming_balance as farming_balance,
  COALESCE(uni_farming_balance, 0) as total_earned,
  updated_at as last_claim_at,
  uni_farming_active as is_active,
  created_at as farming_start,
  created_at,
  updated_at,
  0.01 as farming_rate,
  NULL as farming_start_timestamp,
  updated_at as farming_last_update,
  uni_deposit_amount as farming_deposit
FROM users
WHERE uni_deposit_amount > 0 OR uni_farming_balance > 0;

-- View для ton_farming_data  
CREATE OR REPLACE VIEW ton_farming_data AS
SELECT 
  gen_random_uuid() as id,
  id as user_id,
  ton_wallet_address as wallet_address,
  ton_farming_balance as farming_balance,
  ton_boost_package as boost_package_id,
  created_at,
  updated_at
FROM users
WHERE ton_wallet_address IS NOT NULL OR ton_farming_balance > 0 OR ton_boost_package IS NOT NULL;
`;

    console.log('SQL Views будут созданы через Supabase Dashboard');
    console.log('Сохраняю SQL в файл...');
    
    const fs = await import('fs/promises');
    await fs.writeFile('CREATE_VIEWS_SQL.sql', viewsSQL);
    console.log('✅ SQL сохранен в CREATE_VIEWS_SQL.sql');

    // 5. ФИНАЛЬНАЯ ПРОВЕРКА
    console.log('\n\n📊 ФИНАЛЬНАЯ ПРОВЕРКА:\n');

    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: uniDeposits } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt('uni_deposit_amount', 0);

    const { count: tonBoostUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('ton_boost_package', 'is', null);

    console.log(`Всего пользователей в users: ${totalUsers}`);
    console.log(`Пользователей с UNI депозитами: ${uniDeposits}`);
    console.log(`Пользователей с TON boost: ${tonBoostUsers}`);

    // 6. ИТОГОВЫЙ ОТЧЕТ
    console.log('\n\n✅ МИГРАЦИЯ ЗАВЕРШЕНА!\n');
    console.log('='.repeat(80));
    console.log(`Создано новых пользователей: ${results.created_users}`);
    console.log(`Обновлено депозитов: ${results.updated_deposits}`);
    console.log(`Обновлено boost packages: ${results.updated_boosts}`);
    
    if (results.errors.length > 0) {
      console.log(`\n⚠️  Ошибки (${results.errors.length}):`);
      results.errors.forEach(e => {
        console.log(`- User ${e.user_id}: ${e.error}`);
      });
    }

    console.log('\n📌 СЛЕДУЮЩИЕ ШАГИ:');
    console.log('1. Выполните SQL из файла CREATE_VIEWS_SQL.sql в Supabase Dashboard');
    console.log('2. Обновите boost/service.ts для чтения из users.ton_farming_balance');
    console.log('3. Протестируйте работу через Views');
    console.log('4. Удалите архивные таблицы после проверки');

    // Сохраняем отчет
    const report = {
      timestamp: new Date().toISOString(),
      results,
      next_steps: [
        'Execute CREATE_VIEWS_SQL.sql',
        'Update boost/service.ts',
        'Test Views functionality',
        'Remove archived tables'
      ]
    };

    await fs.writeFile('MIGRATION_REPORT_2025-08-02.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Отчет сохранен в MIGRATION_REPORT_2025-08-02.json');

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА МИГРАЦИИ:', error);
  }
}

// Запуск миграции
console.log('🔧 Запускаем безопасную миграцию данных...\n');
console.log('⚠️  ВНИМАНИЕ: Эта операция изменит данные в базе данных!');
console.log('Убедитесь что у вас есть бэкап!\n');

// Даем 5 секунд на отмену
console.log('Начинаем через 5 секунд... (Ctrl+C для отмены)');
setTimeout(() => {
  migrateToUsersTable();
}, 5000);