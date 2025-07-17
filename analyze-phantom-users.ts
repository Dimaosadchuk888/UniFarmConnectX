import { supabase } from './core/supabase';

async function analyzePhantomUsers() {
  console.log('=== АНАЛИЗ ФАНТОМНЫХ ПОЛЬЗОВАТЕЛЕЙ ===\n');

  // 1. Получаем все записи из ton_farming_data
  const { data: tonFarmingAll } = await supabase
    .from('ton_farming_data')
    .select('*')
    .order('user_id');

  console.log(`Всего записей в ton_farming_data: ${tonFarmingAll?.length || 0}\n`);

  // 2. Проверяем какие пользователи существуют
  if (tonFarmingAll && tonFarmingAll.length > 0) {
    const results = {
      existing: [] as any[],
      phantom: [] as any[],
      zeroBalance: [] as any[]
    };

    for (const farmData of tonFarmingAll) {
      const { data: user } = await supabase
        .from('users')
        .select('id, username, balance_ton')
        .eq('id', parseInt(farmData.user_id))
        .single();

      if (user) {
        results.existing.push({ ...farmData, username: user.username });
      } else {
        results.phantom.push(farmData);
      }

      // Проверяем записи с нулевым балансом
      if (farmData.farming_balance === 0 || farmData.farming_balance === '0') {
        results.zeroBalance.push(farmData);
      }
    }

    console.log('📊 СТАТИСТИКА:\n');
    console.log(`✅ Существующие пользователи: ${results.existing.length}`);
    console.log(`❌ Фантомные пользователи: ${results.phantom.length}`);
    console.log(`⚠️  Записи с нулевым farming_balance: ${results.zeroBalance.length}`);

    console.log('\n🔍 ДЕТАЛИ ФАНТОМНЫХ ЗАПИСЕЙ:');
    results.phantom.forEach(p => {
      console.log(`- User ${p.user_id}: пакет ${p.boost_package_id}, баланс ${p.farming_balance} TON`);
    });

    console.log('\n✅ РЕАЛЬНЫЕ ПОЛЬЗОВАТЕЛИ С TON BOOST:');
    results.existing.forEach(e => {
      console.log(`- User ${e.user_id} (@${e.username}): пакет ${e.boost_package_id}, баланс ${e.farming_balance} TON`);
    });

    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    console.log('1. Удалить фантомные записи из ton_farming_data');
    console.log('2. Удалить записи с нулевым farming_balance (бесполезные)');
    console.log('3. После очистки планировщик будет работать корректно');
    
    console.log('\n⚠️  SQL КОМАНДЫ ДЛЯ ОЧИСТКИ (выполнить в Supabase):');
    
    if (results.phantom.length > 0) {
      const phantomIds = results.phantom.map(p => `'${p.user_id}'`).join(', ');
      console.log(`\n-- Удаление фантомных записей:`);
      console.log(`DELETE FROM ton_farming_data WHERE user_id IN (${phantomIds});`);
    }
    
    if (results.zeroBalance.length > 0) {
      const zeroIds = results.zeroBalance.map(p => `'${p.user_id}'`).join(', ');
      console.log(`\n-- Удаление записей с нулевым балансом:`);
      console.log(`DELETE FROM ton_farming_data WHERE user_id IN (${zeroIds}) AND farming_balance = 0;`);
    }
  }
}

analyzePhantomUsers()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Ошибка:', err);
    process.exit(1);
  });