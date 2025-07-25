/**
 * 🚨 СРОЧНОЕ РАССЛЕДОВАНИЕ: КАК РАБОТАЛИ TON ДЕПОЗИТЫ ДО ПОЛОМКИ
 * Анализ РЕАЛЬНОГО процесса активации без предположений
 */

import { supabase } from './core/supabase';

async function investigateTonDepositFlow() {
  console.log('\n🔍 === РАССЛЕДОВАНИЕ РЕАЛЬНОГО ПРОЦЕССА TON ДЕПОЗИТОВ ===\n');

  try {
    // 1. АНАЛИЗ: Откуда должны браться boost пакеты если таблица boosts пуста?
    console.log('1️⃣ ПОИСК ИСТОЧНИКА BOOST ПАКЕТОВ:');
    console.log('===============================');
    
    // Может быть, пакеты хардкоженные в коде?
    console.log('🔍 Ищем где определяются boost пакеты...');
    
    // Пользователь 290 имеет ton_boost_package: 1
    // Значит ID пакета = 1 откуда-то берется
    
    // 2. АНАЛИЗ: Процесс от депозита до ton_farming_data
    console.log('\n2️⃣ АНАЛИЗ ПРОЦЕССА АКТИВАЦИИ:');
    console.log('=============================');
    console.log('');
    console.log('📋 ТЕКУЩЕЕ СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ 290:');
    console.log('   ✅ Депозит 1 TON в transactions (ID: 1222953)');
    console.log('   ✅ ton_boost_package: 1 (записано в users)');
    console.log('   ✅ ton_boost_rate: 0.001 (записано в users)');
    console.log('   ❌ ton_farming_data: ПУСТО (запись НЕ создана)');
    console.log('   ❌ ton_boost_active: false (не активирован)');
    console.log('');
    
    // 3. КТО ДОЛЖЕН СОЗДАВАТЬ ton_farming_data?
    console.log('3️⃣ КТО СОЗДАЕТ ЗАПИСИ В ton_farming_data:');
    console.log('=====================================');
    console.log('');
    console.log('🔍 Анализ TonFarmingRepository.activateBoost():');
    console.log('   - Этот метод должен создавать записи в ton_farming_data');
    console.log('   - НО он вызывается только из BoostService.activateBoost()');
    console.log('   - BoostService.activateBoost() требует getBoostPackageById()');
    console.log('   - getBoostPackageById() ищет в таблице boosts (ПУСТАЯ!)');
    console.log('');
    console.log('🚨 ПРОБЛЕМА: Циклическая зависимость!');
    console.log('   1. Нет записей в boosts → getBoostPackageById() возвращает null');
    console.log('   2. activateBoost() не вызывается → ton_farming_data не создается');
    console.log('   3. Планировщик не видит пользователя → доходы не генерируются');

    // 4. КАК ЭТО РАБОТАЛО РАНЬШЕ?
    console.log('\n4️⃣ КАК ЭТО РАБОТАЛО ДО ПОЛОМКИ:');
    console.log('===============================');
    console.log('');
    console.log('🤔 ВАРИАНТЫ:');
    console.log('   A) В таблице boosts БЫЛИ записи пакетов');
    console.log('   B) Пакеты определяются хардкодом в коде');
    console.log('   C) Другой механизм создания ton_farming_data');
    console.log('   D) Планировщик работал БЕЗ ton_farming_data');
    console.log('');

    // 5. ПРОВЕРИМ: Может ли планировщик работать с users напрямую?
    console.log('5️⃣ АНАЛИЗ ПЛАНИРОВЩИКА:');
    console.log('======================');
    
    // Проверяем всех пользователей с ton_boost_package
    const { data: usersWithBoosts, error: usersError } = await supabase
      .from('users')
      .select('id, ton_boost_package, ton_boost_active, ton_farming_balance, ton_farming_rate, balance_ton')
      .not('ton_boost_package', 'is', null);

    if (!usersError && usersWithBoosts?.length) {
      console.log(`✅ Найдено ${usersWithBoosts.length} пользователей с TON boost пакетами:`);
      usersWithBoosts.forEach(user => {
        console.log(`   User ${user.id}:`);
        console.log(`     boost_package: ${user.ton_boost_package}`);
        console.log(`     boost_active: ${user.ton_boost_active}`);
        console.log(`     farming_balance: ${user.ton_farming_balance}`);
        console.log(`     farming_rate: ${user.ton_farming_rate}`);
        console.log(`     balance_ton: ${user.balance_ton}`);
        console.log('     ---');
      });
      
      console.log('\n🤔 ВОЗМОЖНАЯ ТЕОРИЯ:');
      console.log('   Планировщик мог работать НАПРЯМУЮ с таблицей users');
      console.log('   А ton_farming_data использовалась для других целей');
    } else {
      console.log('❌ Пользователей с boost пакетами не найдено');
    }

    // 6. ПОИСК В КОДЕ: Где используется ton_boost_package?
    console.log('\n6️⃣ КЛЮЧЕВОЙ ВОПРОС:');
    console.log('==================');
    console.log('');
    console.log('🔍 ГДЕ В КОДЕ ИСПОЛЬЗУЕТСЯ ton_boost_package из users?');
    console.log('   - Планировщик tonBoostIncomeScheduler.ts');
    console.log('   - Возможно работает напрямую с users.ton_boost_package');
    console.log('   - БЕЗ необходимости в ton_farming_data');
    console.log('');
    console.log('💡 ПРЕДПОЛОЖЕНИЕ:');
    console.log('   Система работала ТАК:');
    console.log('   1. Депозит → transactions');
    console.log('   2. Активация → users.ton_boost_package = 1');
    console.log('   3. Планировщик → читает users.ton_boost_package');
    console.log('   4. Доходы → на основе users.ton_farming_rate');
    console.log('');
    console.log('🚨 А ton_farming_data могла быть ДОПОЛНИТЕЛЬНОЙ таблицей');
    console.log('   для детализации или истории активаций');

    // 7. Проверим есть ли ВООБЩЕ записи в ton_farming_data
    console.log('\n7️⃣ ПРОВЕРКА ВСЕЙ ТАБЛИЦЫ ton_farming_data:');
    console.log('=========================================');
    
    const { data: allTonFarmingData, error: allFarmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .limit(10);

    if (!allFarmingError) {
      if (!allTonFarmingData?.length) {
        console.log('❌ Таблица ton_farming_data ПОЛНОСТЬЮ ПУСТА!');
        console.log('   Это означает что система НИКОГДА не использовала эту таблицу');
        console.log('   для активных пользователей');
      } else {
        console.log(`✅ В ton_farming_data есть ${allTonFarmingData.length} записей:`);
        allTonFarmingData.forEach(record => {
          console.log(`   User ${record.user_id}: balance=${record.farming_balance}, active=${record.boost_active}`);
        });
      }
    }

    console.log('\n✅ === РАССЛЕДОВАНИЕ ЗАВЕРШЕНО ===\n');

  } catch (error) {
    console.error('❌ Критическая ошибка расследования:', error);
  }
}

// Запускаем срочное расследование
investigateTonDepositFlow();