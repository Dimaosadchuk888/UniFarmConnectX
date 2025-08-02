import { supabase } from '../core/supabase.js';

async function prepareMigrationPlan() {
  console.log('📋 ПОДГОТОВКА ПЛАНА МИГРАЦИИ');
  console.log('='.repeat(80));
  console.log('');

  const migrationPlan = {
    uni_farming_data: [],
    ton_farming_data: [],
    sql_views: [],
    code_updates: []
  };

  try {
    // 1. Анализ uni_farming_data
    console.log('🔍 АНАЛИЗ UNI_FARMING_DATA:\n');

    const { data: uniData } = await supabase
      .from('uni_farming_data')
      .select('*')
      .order('user_id');

    const { data: usersUni } = await supabase
      .from('users')
      .select('id, uni_deposit_amount, uni_farming_balance, uni_farming_active')
      .order('id');

    const userMap = new Map(usersUni?.map(u => [u.id, u]) || []);
    let uniToMigrate = 0;
    let uniAlreadySynced = 0;

    uniData?.forEach(farming => {
      const user = userMap.get(farming.user_id);
      
      if (!user) {
        // Пользователя нет в users - нужно создать
        migrationPlan.uni_farming_data.push({
          action: 'CREATE_USER',
          user_id: farming.user_id,
          data: farming
        });
        uniToMigrate++;
      } else if (farming.deposit_amount > 0 && user.uni_deposit_amount === 0) {
        // Есть депозит в старой таблице, но нет в users
        migrationPlan.uni_farming_data.push({
          action: 'UPDATE_DEPOSIT',
          user_id: farming.user_id,
          old_value: user.uni_deposit_amount,
          new_value: farming.deposit_amount,
          farming_balance: farming.farming_balance
        });
        uniToMigrate++;
      } else if (Math.abs(farming.farming_balance - user.uni_farming_balance) > 0.01) {
        // Баланс отличается
        console.log(`⚠️  User ${farming.user_id}: баланс отличается (${farming.farming_balance} vs ${user.uni_farming_balance})`);
      } else {
        uniAlreadySynced++;
      }
    });

    console.log(`✅ Уже синхронизировано: ${uniAlreadySynced} записей`);
    console.log(`📋 Требуют миграции: ${uniToMigrate} записей`);
    console.log(`⚠️  Из них с депозитами: ${migrationPlan.uni_farming_data.filter(m => m.action === 'UPDATE_DEPOSIT').length}`);

    // 2. Анализ ton_farming_data
    console.log('\n\n🔍 АНАЛИЗ TON_FARMING_DATA:\n');

    const { data: tonData } = await supabase
      .from('ton_farming_data')
      .select('*')
      .order('user_id');

    const { data: usersTon } = await supabase
      .from('users')
      .select('id, ton_boost_package, ton_farming_balance, ton_wallet_address')
      .order('id');

    const tonUserMap = new Map(usersTon?.map(u => [u.id, u]) || []);
    let tonToMigrate = 0;
    let tonAlreadySynced = 0;

    tonData?.forEach(farming => {
      const user = tonUserMap.get(farming.user_id);
      
      if (farming.boost_package_id && (!user?.ton_boost_package || user.ton_boost_package !== farming.boost_package_id)) {
        // Boost package отличается
        migrationPlan.ton_farming_data.push({
          action: 'UPDATE_BOOST',
          user_id: farming.user_id,
          old_boost: user?.ton_boost_package,
          new_boost: farming.boost_package_id,
          wallet: farming.wallet_address,
          farming_balance: farming.farming_balance
        });
        tonToMigrate++;
      } else {
        tonAlreadySynced++;
      }
    });

    console.log(`✅ Уже синхронизировано: ${tonAlreadySynced} записей`);
    console.log(`📋 Требуют миграции: ${tonToMigrate} записей`);

    // 3. План создания SQL Views
    console.log('\n\n🔧 ПЛАН СОЗДАНИЯ SQL VIEWS:\n');

    migrationPlan.sql_views = [
      {
        name: 'uni_farming_data',
        description: 'View для обратной совместимости с uni_farming_data',
        sql: `CREATE OR REPLACE VIEW uni_farming_data AS
SELECT 
  id as user_id,
  uni_deposit_amount as deposit_amount,
  uni_farming_balance as farming_balance,
  uni_farming_active as is_active,
  created_at,
  updated_at
FROM users
WHERE uni_deposit_amount > 0 OR uni_farming_balance > 0;`
      },
      {
        name: 'ton_farming_data',
        description: 'View для обратной совместимости с ton_farming_data',
        sql: `CREATE OR REPLACE VIEW ton_farming_data AS
SELECT 
  id as user_id,
  ton_wallet_address as wallet_address,
  ton_farming_balance as farming_balance,
  ton_boost_package as boost_package_id,
  created_at,
  updated_at
FROM users
WHERE ton_wallet_address IS NOT NULL OR ton_farming_balance > 0;`
      }
    ];

    console.log('Будут созданы 2 SQL View для обратной совместимости');
    console.log('- uni_farming_data → читает из users');
    console.log('- ton_farming_data → читает из users');

    // 4. Код который нужно обновить
    console.log('\n\n📝 КОД ТРЕБУЮЩИЙ ОБНОВЛЕНИЯ:\n');

    migrationPlan.code_updates = [
      {
        file: 'modules/boost/service.ts',
        line: 1116,
        issue: 'Читает farming_balance из ton_farming_data',
        fix: 'Изменить на чтение из users.ton_farming_balance'
      }
    ];

    console.log('1 файл требует обновления после миграции');

    // 5. Сохраняем план
    console.log('\n\n💾 СОХРАНЕНИЕ ПЛАНА МИГРАЦИИ:\n');
    
    const planSummary = {
      timestamp: new Date().toISOString(),
      summary: {
        uni_records_to_migrate: uniToMigrate,
        ton_records_to_migrate: tonToMigrate,
        total_records_to_migrate: uniToMigrate + tonToMigrate,
        sql_views_to_create: 2,
        code_files_to_update: 1
      },
      details: migrationPlan
    };

    const fs = await import('fs/promises');
    await fs.writeFile('MIGRATION_PLAN_2025-08-02.json', JSON.stringify(planSummary, null, 2));
    console.log('✅ План миграции сохранен в MIGRATION_PLAN_2025-08-02.json');

    // 6. Итоговые рекомендации
    console.log('\n\n✅ РЕКОМЕНДАЦИИ ПО МИГРАЦИИ:\n');
    console.log('1. Сначала выполнить UPDATE для существующих записей');
    console.log('2. НЕ создавать новые записи в users (чтобы избежать дублирования)');
    console.log('3. Создать SQL Views ПОСЛЕ миграции данных');
    console.log('4. Обновить код boost/service.ts');
    console.log('5. Протестировать работу через Views');
    console.log('6. Архивировать старые таблицы (переименовать с префиксом _archived_)');

  } catch (error) {
    console.error('❌ Ошибка подготовки плана:', error);
  }
}

// Запуск подготовки
console.log('Готовлю план миграции...\n');
prepareMigrationPlan();