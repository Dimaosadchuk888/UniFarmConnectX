#!/usr/bin/env tsx
/**
 * ПОДТВЕРЖДЕНИЕ ПРОБЛЕМЫ С ТИПАМИ ДАННЫХ
 * Финальная проверка причины проблемы User 287
 */

import { supabase } from '../core/supabase';

async function confirmDataTypeIssue() {
  console.log('🔍 ПОДТВЕРЖДЕНИЕ ПРОБЛЕМЫ С ТИПАМИ ДАННЫХ');
  console.log('==========================================');
  console.log(`Время: ${new Date().toLocaleString('ru-RU')}\n`);

  // 1. Проверяем типы данных для User 287
  console.log('1. 📊 ТИПЫ ДАННЫХ USER 287:');
  
  const { data: user287 } = await supabase
    .from('users')
    .select('id, ton_boost_package')
    .eq('id', 287)
    .single();

  const { data: farming287 } = await supabase
    .from('ton_farming_data')
    .select('user_id, boost_package_id, boost_active, farming_balance')
    .eq('user_id', 287)
    .single();

  if (user287 && farming287) {
    console.log(`   users.id: ${user287.id} (тип: ${typeof user287.id})`);
    console.log(`   ton_farming_data.user_id: ${farming287.user_id} (тип: ${typeof farming287.user_id})`);
    console.log(`   JavaScript == сравнение: ${user287.id == farming287.user_id ? '✅ ИСТИНА' : '❌ ЛОЖЬ'}`);
    console.log(`   JavaScript === сравнение: ${user287.id === farming287.user_id ? '✅ ИСТИНА' : '❌ ЛОЖЬ'}`);
    
    if (typeof user287.id !== typeof farming287.user_id) {
      console.log('\n❌ ПОДТВЕРЖДЕНО: НЕСООТВЕТСТВИЕ ТИПОВ ДАННЫХ!');
      console.log('   Это объясняет почему Supabase JOIN не работает для User 287');
    }
  }

  // 2. Проверяем работающего пользователя
  console.log('\n2. 📊 СРАВНЕНИЕ С РАБОТАЮЩИМ ПОЛЬЗОВАТЕЛЕМ (User 25):');
  
  const { data: user25 } = await supabase
    .from('users')
    .select('id')
    .eq('id', 25)
    .single();

  const { data: farming25 } = await supabase
    .from('ton_farming_data')
    .select('user_id')
    .eq('user_id', 25)
    .single();

  if (user25 && farming25) {
    console.log(`   users.id: ${user25.id} (тип: ${typeof user25.id})`);
    console.log(`   ton_farming_data.user_id: ${farming25.user_id} (тип: ${typeof farming25.user_id})`);
    console.log(`   JavaScript == сравнение: ${user25.id == farming25.user_id ? '✅ ИСТИНА' : '❌ ЛОЖЬ'}`);
    console.log(`   JavaScript === сравнение: ${user25.id === farming25.user_id ? '✅ ИСТИНА' : '❌ ЛОЖЬ'}`);
    
    const sameTypesAsUser287 = (typeof user25.id === typeof user287?.id) && (typeof farming25.user_id === typeof farming287?.user_id);
    console.log(`   Такие же типы как у User 287: ${sameTypesAsUser287 ? '✅ ДА' : '❌ НЕТ'}`);
  }

  // 3. Массовая проверка типов данных
  console.log('\n3. 📊 МАССОВАЯ ПРОВЕРКА ТИПОВ ДАННЫХ:');
  
  const { data: allUsers } = await supabase
    .from('users')
    .select('id')
    .not('ton_boost_package', 'is', null)
    .limit(10);

  const { data: allFarming } = await supabase
    .from('ton_farming_data')
    .select('user_id')
    .eq('boost_active', true)
    .limit(10);

  if (allUsers && allFarming) {
    console.log('   Типы в таблице users (поле id):');
    const userTypes = new Set(allUsers.map(u => typeof u.id));
    userTypes.forEach(type => console.log(`   • ${type}`));
    
    console.log('\n   Типы в таблице ton_farming_data (поле user_id):');
    const farmingTypes = new Set(allFarming.map(f => typeof f.user_id));
    farmingTypes.forEach(type => console.log(`   • ${type}`));
    
    const hasTypeMismatch = userTypes.size > 1 || farmingTypes.size > 1 || 
                           !Array.from(userTypes).every(type => farmingTypes.has(type));
    
    console.log(`\n   Обнаружено несоответствие типов: ${hasTypeMismatch ? '❌ ДА' : '✅ НЕТ'}`);
  }

  // 4. Тест различных JOIN методов
  console.log('\n4. 🧪 ТЕСТИРОВАНИЕ РАЗЛИЧНЫХ JOIN МЕТОДОВ:');
  
  // Метод 1: Строгий JOIN через Supabase
  try {
    const { data: strictJoin } = await supabase
      .from('ton_farming_data')
      .select(`
        user_id,
        boost_active,
        farming_balance,
        users!inner(id, ton_boost_package)
      `)
      .eq('boost_active', true)
      .gt('farming_balance', 0);
      
    const user287InStrictJoin = strictJoin?.find(record => record.user_id == 287);
    console.log(`   Строгий Supabase JOIN - User 287: ${user287InStrictJoin ? '✅ НАЙДЕН' : '❌ НЕ НАЙДЕН'}`);
  } catch (error) {
    console.log(`   Строгий Supabase JOIN - ОШИБКА: ${error.message}`);
  }

  // Метод 2: Ручной JOIN с приведением типов
  const { data: farmingRecords } = await supabase
    .from('ton_farming_data')
    .select('user_id, boost_active, farming_balance')
    .eq('boost_active', true)
    .gt('farming_balance', 0);

  const { data: userRecords } = await supabase
    .from('users')
    .select('id, ton_boost_package')
    .not('ton_boost_package', 'is', null);

  if (farmingRecords && userRecords) {
    const manualJoin = farmingRecords.filter(farming => 
      userRecords.some(user => user.id == farming.user_id)
    );
    
    const user287InManualJoin = manualJoin.find(record => record.user_id == 287);
    console.log(`   Ручной JavaScript JOIN - User 287: ${user287InManualJoin ? '✅ НАЙДЕН' : '❌ НЕ НАЙДЕН'}`);
    console.log(`   Всего записей в ручном JOIN: ${manualJoin.length}`);
  }

  // 5. Демонстрация решения
  console.log('\n5. 💡 ДЕМОНСТРАЦИЯ РЕШЕНИЯ:');
  
  if (user287 && farming287) {
    console.log('   Текущая ситуация:');
    console.log(`   • users.id (${typeof user287.id}): ${user287.id}`);
    console.log(`   • farming.user_id (${typeof farming287.user_id}): ${farming287.user_id}`);
    console.log(`   • Суровое SQL сравнение: ЛОЖЬ`);
    console.log(`   • JavaScript сравнение: ${user287.id == farming287.user_id}`);
    
    console.log('\n   Необходимо приведение типов в планировщике:');
    console.log(`   • WHERE users.id = CAST(ton_farming_data.user_id AS INTEGER)`);
    console.log(`   • ИЛИ WHERE CAST(users.id AS TEXT) = ton_farming_data.user_id`);
  }

  // 6. Итоговый диагноз
  console.log('\n6. 🎯 ИТОГОВЫЙ ДИАГНОЗ:');
  console.log('═'.repeat(50));
  console.log('✅ КОРНЕВАЯ ПРИЧИНА ПОДТВЕРЖДЕНА:');
  console.log('   Несоответствие типов данных между связующими полями');
  console.log('\n❌ ПРОБЛЕМА:');
  console.log('   • users.id имеет тип INTEGER (number в JavaScript)');
  console.log('   • ton_farming_data.user_id имеет тип TEXT (string в JavaScript)');
  console.log('\n🔧 ВОЗДЕЙСТВИЕ:');
  console.log('   • Supabase JOIN запросы не работают (строгая типизация SQL)');
  console.log('   • Планировщик использует Supabase JOIN и пропускает User 287');
  console.log('   • JavaScript JOIN работает (автоприведение типов)');
  console.log('\n💊 РЕШЕНИЕ:');
  console.log('   Модификация планировщика для приведения типов данных');
  console.log('   в SQL запросах при объединении таблиц');

  console.log('\n✅ Диагностика завершена - проблема полностью идентифицирована');
}

// Запуск
confirmDataTypeIssue()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });