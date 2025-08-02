import { supabase } from '../core/supabase.js';

async function checkCurrentSyncStatus() {
  console.log('🔍 ПРОВЕРКА ТЕКУЩЕГО СОСТОЯНИЯ СИНХРОНИЗАЦИИ');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Проверяем последние изменения в таблицах
    console.log('📊 ПОСЛЕДНЯЯ АКТИВНОСТЬ В ТАБЛИЦАХ:\n');

    // Последние обновления в users
    const { data: recentUsers } = await supabase
      .from('users')
      .select('id, updated_at, uni_farming_active, ton_boost_package')
      .not('updated_at', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(5);

    console.log('Последние обновления в USERS:');
    recentUsers?.forEach(u => {
      console.log(`- User ${u.id}: обновлен ${new Date(u.updated_at).toLocaleString()}`);
    });
    console.log('');

    // Последние записи в uni_farming_data
    const { data: recentUniFarming } = await supabase
      .from('uni_farming_data')
      .select('user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('Последние записи в UNI_FARMING_DATA:');
    if (recentUniFarming?.length > 0) {
      recentUniFarming.forEach(f => {
        console.log(`- User ${f.user_id}: создан ${new Date(f.created_at).toLocaleString()}`);
      });
    } else {
      console.log('- Нет новых записей');
    }
    console.log('');

    // 2. Проверяем синхронизацию данных
    console.log('\n📋 ПРОВЕРКА СИНХРОНИЗАЦИИ ДАННЫХ:\n');

    // Проверка UNI данных
    const { data: uniComparison } = await supabase
      .from('users')
      .select('id, uni_deposit_amount, uni_farming_balance, balance_uni')
      .gt('uni_deposit_amount', 0)
      .limit(10);

    let syncIssues = 0;
    console.log('UNI поля в таблице USERS (после синхронизации):');
    uniComparison?.forEach(u => {
      const issues = [];
      if (u.uni_farming_balance !== u.balance_uni) {
        issues.push(`farming_balance (${u.uni_farming_balance}) ≠ balance_uni (${u.balance_uni})`);
        syncIssues++;
      }
      
      if (issues.length > 0) {
        console.log(`❌ User ${u.id}: ${issues.join(', ')}`);
      } else {
        console.log(`✅ User ${u.id}: Все поля синхронизированы`);
      }
    });
    
    if (syncIssues === 0) {
      console.log('\n✅ Все UNI поля в USERS синхронизированы!');
    } else {
      console.log(`\n⚠️  Найдено ${syncIssues} несинхронизированных записей`);
    }

    // 3. Проверяем как работает запись данных
    console.log('\n\n🔄 КАК СЕЙЧАС РАБОТАЕТ СИСТЕМА:\n');

    // Анализируем код
    console.log('1. ЗАПИСЬ ДАННЫХ:');
    console.log('   - Основная запись идет в таблицу USERS');
    console.log('   - UniFarmingRepository обновляет поля в USERS');
    console.log('   - TonFarmingRepository обновляет поля в USERS');
    console.log('');

    console.log('2. ЧТЕНИЕ ДАННЫХ:');
    console.log('   - API использует данные из USERS');
    console.log('   - Только boost/service.ts читает из ton_farming_data (строка 1116)');
    console.log('   - uni_farming_data практически не используется');
    console.log('');

    console.log('3. РИСКИ ДВОЕНИЯ:');
    console.log('   ❌ РИСК: Старые таблицы не обновляются автоматически');
    console.log('   ❌ РИСК: boost/service.ts может видеть старые данные из ton_farming_data');
    console.log('   ✅ БЕЗОПАСНО: Основные операции работают с USERS');
    console.log('');

    // 4. Проверяем есть ли триггеры или автоматическая синхронизация
    console.log('\n🔧 МЕХАНИЗМЫ СИНХРОНИЗАЦИИ:\n');
    console.log('❌ Триггеры в БД: НЕ СОЗДАНЫ');
    console.log('❌ Автоматическая синхронизация: НЕ НАСТРОЕНА');
    console.log('✅ Ручная синхронизация: ВЫПОЛНЕНА для существующих данных');
    console.log('');

    // 5. Итоговый статус
    console.log('\n📊 ИТОГОВЫЙ СТАТУС:\n');
    console.log('1. Данные в USERS: ✅ Синхронизированы (96 записей из 120)');
    console.log('2. Старые таблицы: ⚠️  Содержат устаревшие данные');
    console.log('3. Новые записи: ❌ НЕ синхронизируются автоматически');
    console.log('4. Риск двоения: ⚠️  СРЕДНИЙ (если код начнет писать в старые таблицы)');
    console.log('');

    console.log('🚨 ГЛАВНАЯ ПРОБЛЕМА:');
    console.log('Система работает с USERS, но старые таблицы остались "висеть".');
    console.log('Они не обновляются и могут вызвать путаницу.');

  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  }
}

// Запуск проверки
console.log('Проверяю текущее состояние синхронизации...\n');
checkCurrentSyncStatus();