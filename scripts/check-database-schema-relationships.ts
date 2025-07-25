#!/usr/bin/env tsx
/**
 * ПРОВЕРКА СХЕМЫ БД И СВЯЗЕЙ - ПРИЧИНА ПРОБЛЕМЫ USER 287
 */

import { supabase } from '../core/supabase';

async function checkDatabaseSchemaRelationships() {
  console.log('🔍 ПРОВЕРКА СХЕМЫ БД И СВЯЗЕЙ - ДИАГНОСТИКА USER 287');
  console.log('===================================================');
  console.log(`Время: ${new Date().toLocaleString('ru-RU')}\n`);

  // 1. Проверяем данные User 287 напрямую
  console.log('1. 📊 ПРЯМАЯ ПРОВЕРКА ДАННЫХ USER 287:');
  
  const { data: user287, error: userError } = await supabase
    .from('users')
    .select('id, ton_boost_package, ton_boost_package_id, ton_boost_rate, ton_boost_start_timestamp')
    .eq('id', 287)
    .single();

  console.log('   Таблица users:');
  if (userError) {
    console.log(`   ❌ Ошибка: ${userError.message}`);
  } else {
    console.log(`   ✅ Найдено: ${JSON.stringify(user287, null, 2)}`);
  }

  const { data: farming287, error: farmingError } = await supabase
    .from('ton_farming_data')
    .select('user_id, boost_package_id, boost_active, farming_balance, farming_rate, start_date, end_date')
    .eq('user_id', 287);

  console.log('\n   Таблица ton_farming_data:');
  if (farmingError) {
    console.log(`   ❌ Ошибка: ${farmingError.message}`);
  } else {
    console.log(`   ✅ Найдено: ${JSON.stringify(farming287, null, 2)}`);
  }

  // 2. Проверяем типы данных в связующих полях
  console.log('\n2. 🔍 АНАЛИЗ ТИПОВ ДАННЫХ В СВЯЗУЮЩИХ ПОЛЯХ:');
  
  if (user287 && farming287?.length > 0) {
    const userRecord = user287;
    const farmingRecord = farming287[0];
    
    console.log('   Поля связи:');
    console.log(`   • users.id: ${userRecord.id} (тип: ${typeof userRecord.id})`);
    console.log(`   • ton_farming_data.user_id: ${farmingRecord.user_id} (тип: ${typeof farmingRecord.user_id})`);
    console.log(`   • users.ton_boost_package: ${userRecord.ton_boost_package} (тип: ${typeof userRecord.ton_boost_package})`);
    console.log(`   • users.ton_boost_package_id: ${userRecord.ton_boost_package_id} (тип: ${typeof userRecord.ton_boost_package_id})`);
    console.log(`   • ton_farming_data.boost_package_id: ${farmingRecord.boost_package_id} (тип: ${typeof farmingRecord.boost_package_id})`);
    
    // Проверяем соответствие
    const userIdMatch = userRecord.id == farmingRecord.user_id;
    const packageIdMatch = userRecord.ton_boost_package == farmingRecord.boost_package_id;
    
    console.log('\n   Соответствие полей:');
    console.log(`   • id = user_id: ${userIdMatch ? '✅ ДА' : '❌ НЕТ'} (${userRecord.id} vs ${farmingRecord.user_id})`);
    console.log(`   • ton_boost_package = boost_package_id: ${packageIdMatch ? '✅ ДА' : '❌ НЕТ'} (${userRecord.ton_boost_package} vs ${farmingRecord.boost_package_id})`);
    
    // Строгая проверка типов
    console.log('\n   Строгая проверка типов:');
    console.log(`   • id === user_id: ${userRecord.id === farmingRecord.user_id ? '✅ ДА' : '❌ НЕТ'}`);
    console.log(`   • ton_boost_package === boost_package_id: ${userRecord.ton_boost_package === farmingRecord.boost_package_id ? '✅ ДА' : '❌ НЕТ'}`);
  }

  // 3. Проверяем работающего пользователя для сравнения
  console.log('\n3. 🔍 СРАВНЕНИЕ С РАБОТАЮЩИМ ПОЛЬЗОВАТЕЛЕМ (User 25):');
  
  const { data: user25 } = await supabase
    .from('users')
    .select('id, ton_boost_package, ton_boost_package_id, ton_boost_rate')
    .eq('id', 25)
    .single();

  const { data: farming25 } = await supabase
    .from('ton_farming_data')
    .select('user_id, boost_package_id, boost_active, farming_balance')
    .eq('user_id', 25);

  if (user25 && farming25?.length > 0) {
    console.log('   User 25 - Таблица users:');
    console.log(`   ${JSON.stringify(user25, null, 2)}`);
    console.log('\n   User 25 - Таблица ton_farming_data:');
    console.log(`   ${JSON.stringify(farming25[0], null, 2)}`);
    
    console.log('\n   Типы данных User 25:');
    console.log(`   • id: ${user25.id} (${typeof user25.id})`);
    console.log(`   • user_id: ${farming25[0].user_id} (${typeof farming25[0].user_id})`);
    console.log(`   • ton_boost_package: ${user25.ton_boost_package} (${typeof user25.ton_boost_package})`);
    console.log(`   • boost_package_id: ${farming25[0].boost_package_id} (${typeof farming25[0].boost_package_id})`);
  }

  // 4. Ручная имитация JOIN логики планировщика
  console.log('\n4. 🧪 РУЧНАЯ ИМИТАЦИЯ JOIN ЛОГИКИ:');
  
  // Получаем всех пользователей с TON Boost
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, ton_boost_package, ton_boost_package_id')
    .not('ton_boost_package', 'is', null);

  // Получаем все активные записи farming
  const { data: allFarming } = await supabase
    .from('ton_farming_data')
    .select('user_id, boost_package_id, boost_active, farming_balance')
    .eq('boost_active', true)
    .gt('farming_balance', 0);

  console.log(`   • Пользователей с TON Boost: ${allUsers?.length || 0}`);
  console.log(`   • Активных записей farming: ${allFarming?.length || 0}`);

  if (allUsers && allFarming) {
    // Ручной JOIN
    const manualJoin = [];
    
    allUsers.forEach(user => {
      allFarming.forEach(farming => {
        // Пробуем разные варианты JOIN
        if (user.id == farming.user_id) {
          manualJoin.push({
            user_id: user.id,
            ton_boost_package: user.ton_boost_package,
            boost_package_id: farming.boost_package_id,
            farming_balance: farming.farming_balance,
            join_method: 'user.id = farming.user_id'
          });
        }
      });
    });

    console.log(`\n   Результат ручного JOIN: ${manualJoin.length} записей`);
    
    const user287InManualJoin = manualJoin.find(record => record.user_id === 287);
    console.log(`   User 287 в ручном JOIN: ${user287InManualJoin ? '✅ ДА' : '❌ НЕТ'}`);
    
    if (user287InManualJoin) {
      console.log(`   Данные User 287: ${JSON.stringify(user287InManualJoin, null, 2)}`);
    } else {
      console.log('\n   🔍 ДЕТАЛЬНАЯ ПРОВЕРКА User 287:');
      const user287InUsers = allUsers.find(u => u.id === 287);
      const user287InFarming = allFarming.find(f => f.user_id == 287);
      
      console.log(`   • User 287 в списке users: ${user287InUsers ? '✅ ДА' : '❌ НЕТ'}`);
      console.log(`   • User 287 в списке farming: ${user287InFarming ? '✅ ДА' : '❌ НЕТ'}`);
      
      if (user287InUsers && user287InFarming) {
        console.log('\n   Данные для сравнения:');
        console.log(`   • users.id: ${user287InUsers.id} (${typeof user287InUsers.id})`);
        console.log(`   • farming.user_id: ${user287InFarming.user_id} (${typeof user287InFarming.user_id})`);
        console.log(`   • Совпадение: ${user287InUsers.id == user287InFarming.user_id ? '✅ ДА' : '❌ НЕТ'}`);
        console.log(`   • Строгое совпадение: ${user287InUsers.id === user287InFarming.user_id ? '✅ ДА' : '❌ НЕТ'}`);
        
        if (user287InUsers.id != user287InFarming.user_id) {
          console.log('\n   ❌ ПРОБЛЕМА: Типы данных user_id не совпадают!');
          console.log(`      users.id имеет тип ${typeof user287InUsers.id}`);
          console.log(`      ton_farming_data.user_id имеет тип ${typeof user287InFarming.user_id}`);
        }
      }
    }

    // Показываем работающих пользователей
    console.log('\n   📋 Пользователи в результате JOIN:');
    manualJoin.forEach(record => {
      console.log(`   • User ${record.user_id}: package ${record.ton_boost_package}, farming ${record.farming_balance} TON`);
    });
  }

  // 5. Проверка SQL типов через прямой запрос
  console.log('\n5. 🗃️ ПРОВЕРКА ТИПОВ ДАННЫХ В БД:');
  
  try {
    const { data: usersSchema, error: usersSchemaError } = await supabase.rpc('get_table_schema', { table_name: 'users' });
    const { data: farmingSchema, error: farmingSchemaError } = await supabase.rpc('get_table_schema', { table_name: 'ton_farming_data' });
    
    if (usersSchemaError || farmingSchemaError) {
      console.log('   ❌ Не удалось получить схему через RPC');
    } else {
      console.log('   ✅ Схема получена через RPC');
    }
  } catch (e) {
    console.log('   ❌ RPC функция недоступна, используем альтернативный метод');
  }

  // 6. Итоговые выводы
  console.log('\n6. 🎯 ФИНАЛЬНЫЙ ДИАГНОЗ:');
  console.log('═'.repeat(50));

  if (user287 && farming287?.length > 0) {
    const userRecord = user287;
    const farmingRecord = farming287[0];
    
    console.log('📊 Анализ данных User 287:');
    console.log(`   • Данные в users: ✅ ЕСТЬ`);
    console.log(`   • Данные в ton_farming_data: ✅ ЕСТЬ`);
    console.log(`   • Активность farming: ${farmingRecord.boost_active ? '✅ АКТИВЕН' : '❌ НЕАКТИВЕН'}`);
    console.log(`   • Баланс farming: ${farmingRecord.farming_balance} TON`);
    
    const typeMatch = typeof userRecord.id === typeof farmingRecord.user_id;
    const valueMatch = userRecord.id == farmingRecord.user_id;
    
    console.log(`\n🔗 Анализ связи таблиц:`);
    console.log(`   • Типы данных совпадают: ${typeMatch ? '✅ ДА' : '❌ НЕТ'}`);
    console.log(`   • Значения совпадают: ${valueMatch ? '✅ ДА' : '❌ НЕТ'}`);
    
    if (!typeMatch) {
      console.log('\n❌ КОРНЕВАЯ ПРИЧИНА НАЙДЕНА:');
      console.log('   НЕСООТВЕТСТВИЕ ТИПОВ ДАННЫХ в связующих полях');
      console.log(`   • users.id: тип ${typeof userRecord.id}`);
      console.log(`   • ton_farming_data.user_id: тип ${typeof farmingRecord.user_id}`);
      console.log('\n   Это объясняет почему:');
      console.log('   1. Supabase JOIN запросы не работают');
      console.log('   2. Планировщик не может связать таблицы');
      console.log('   3. User 287 пропускается при выборке');
    } else if (!valueMatch) {
      console.log('\n❌ КОРНЕВАЯ ПРИЧИНА НАЙДЕНА:');
      console.log('   НЕСООТВЕТСТВИЕ ЗНАЧЕНИЙ в связующих полях');
      console.log(`   • users.id: ${userRecord.id}`);
      console.log(`   • ton_farming_data.user_id: ${farmingRecord.user_id}`);
    } else {
      console.log('\n⚠️ ДАННЫЕ КОРРЕКТНЫ, ПРОБЛЕМА В ДРУГОМ МЕСТЕ');
      console.log('   Возможно проблема в логике планировщика или схеме Supabase');
    }
  }

  console.log('\n✅ Диагностика схемы БД завершена');
}

// Запуск
checkDatabaseSchemaRelationships()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });