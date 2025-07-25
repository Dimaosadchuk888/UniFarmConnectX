#!/usr/bin/env tsx
/**
 * АНАЛИЗ ИСТОРИИ ТИПОВ ДАННЫХ - ПОЧЕМУ ПОЯВИЛАСЬ ПРОБЛЕМА
 * Исследование когда и как появились смешанные типы
 */

import { supabase } from '../core/supabase';

async function analyzeDataTypeHistory() {
  console.log('🔍 АНАЛИЗ ИСТОРИИ ТИПОВ ДАННЫХ');
  console.log('==============================');
  console.log(`Время: ${new Date().toLocaleString('ru-RU')}\n`);

  // 1. Анализ всех пользователей с TON Boost
  console.log('1. 📊 ПОЛНЫЙ АНАЛИЗ ПОЛЬЗОВАТЕЛЕЙ С TON BOOST:');
  
  const { data: allBoostUsers } = await supabase
    .from('users')
    .select('id, ton_boost_package, created_at')
    .not('ton_boost_package', 'is', null)
    .order('id');

  const { data: allFarmingData } = await supabase
    .from('ton_farming_data')
    .select('user_id, boost_package_id, created_at')
    .order('user_id');

  console.log(`   Пользователей с TON Boost: ${allBoostUsers?.length || 0}`);
  console.log(`   Записей в ton_farming_data: ${allFarmingData?.length || 0}`);

  // 2. Анализ типов данных по группам
  console.log('\n2. 📋 АНАЛИЗ ТИПОВ ДАННЫХ ПО ГРУППАМ:');
  
  if (allBoostUsers && allFarmingData) {
    // Группируем пользователей по типам ID
    const userIdTypes = new Map();
    const farmingIdTypes = new Map();
    
    allBoostUsers.forEach(user => {
      const type = typeof user.id;
      if (!userIdTypes.has(type)) userIdTypes.set(type, []);
      userIdTypes.get(type).push(user.id);
    });
    
    allFarmingData.forEach(farming => {
      const type = typeof farming.user_id;
      if (!farmingIdTypes.has(type)) farmingIdTypes.set(type, []);
      farmingIdTypes.get(type).push(farming.user_id);
    });

    console.log('   Типы в таблице users (id):');
    for (const [type, ids] of userIdTypes) {
      console.log(`   • ${type}: ${ids.length} записей (${ids.slice(0, 5).join(', ')}${ids.length > 5 ? '...' : ''})`);
    }
    
    console.log('\n   Типы в таблице ton_farming_data (user_id):');
    for (const [type, ids] of farmingIdTypes) {
      console.log(`   • ${type}: ${ids.length} записей (${ids.slice(0, 5).join(', ')}${ids.length > 5 ? '...' : ''})`);
    }

    // 3. Поиск пользователей которые НЕ найдены в JOIN
    console.log('\n3. 🔍 ПОЛЬЗОВАТЕЛИ НЕ ПРОХОДЯЩИЕ JOIN:');
    
    const joinFailures = [];
    allBoostUsers.forEach(user => {
      const farmingRecord = allFarmingData.find(f => f.user_id == user.id);
      const strictMatch = allFarmingData.find(f => f.user_id === user.id);
      
      if (farmingRecord && !strictMatch) {
        joinFailures.push({
          userId: user.id,
          userIdType: typeof user.id,
          farmingUserId: farmingRecord.user_id,
          farmingUserIdType: typeof farmingRecord.user_id,
          looseMatch: true,
          strictMatch: false
        });
      }
    });

    console.log(`   Пользователей с проблемами JOIN: ${joinFailures.length}`);
    
    if (joinFailures.length > 0) {
      console.log('\n   Детальный список проблемных пользователей:');
      joinFailures.forEach(failure => {
        console.log(`   • User ${failure.userId} (${failure.userIdType}) → farming "${failure.farmingUserId}" (${failure.farmingUserIdType})`);
      });
      
      // Показываем примеры работающих пользователей
      console.log('\n   Примеры РАБОТАЮЩИХ пользователей (для сравнения):');
      const workingUsers = allBoostUsers.filter(user => {
        const farmingRecord = allFarmingData.find(f => f.user_id === user.id);
        return farmingRecord;
      }).slice(0, 3);
      
      workingUsers.forEach(user => {
        const farming = allFarmingData.find(f => f.user_id === user.id);
        console.log(`   • User ${user.id} (${typeof user.id}) → farming ${farming?.user_id} (${typeof farming?.user_id}) ✅`);
      });
    }

    // 4. Хронологический анализ
    console.log('\n4. 📅 ХРОНОЛОГИЧЕСКИЙ АНАЛИЗ:');
    
    // Группируем по датам создания
    const usersByDate = new Map();
    const farmingByDate = new Map();
    
    allBoostUsers.forEach(user => {
      if (user.created_at) {
        const date = user.created_at.split('T')[0];
        if (!usersByDate.has(date)) usersByDate.set(date, []);
        usersByDate.get(date).push(user);
      }
    });
    
    allFarmingData.forEach(farming => {
      if (farming.created_at) {
        const date = farming.created_at.split('T')[0];
        if (!farmingByDate.has(date)) farmingByDate.set(date, []);
        farmingByDate.get(date).push(farming);
      }
    });

    console.log('   Создание пользователей по датам:');
    const sortedUserDates = Array.from(usersByDate.keys()).sort().reverse().slice(0, 5);
    sortedUserDates.forEach(date => {
      const users = usersByDate.get(date);
      const sampleUser = users[0];
      console.log(`   ${date}: ${users.length} пользователей (пример: User ${sampleUser.id}, тип: ${typeof sampleUser.id})`);
    });
    
    console.log('\n   Создание записей farming по датам:');
    const sortedFarmingDates = Array.from(farmingByDate.keys()).sort().reverse().slice(0, 5);
    sortedFarmingDates.forEach(date => {
      const records = farmingByDate.get(date);
      const sampleRecord = records[0];
      console.log(`   ${date}: ${records.length} записей (пример: User ${sampleRecord.user_id}, тип: ${typeof sampleRecord.user_id})`);
    });
  }

  // 5. Проверка планировщика - кто получает начисления сейчас
  console.log('\n5. 🎯 КТО ПОЛУЧАЕТ НАЧИСЛЕНИЯ СЕЙЧАС:');
  
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: recentIncomes } = await supabase
    .from('transactions')
    .select('user_id, created_at, amount_ton')
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false });

  if (recentIncomes && recentIncomes.length > 0) {
    const uniqueUsers = [...new Set(recentIncomes.map(tx => tx.user_id))];
    console.log(`   Активных пользователей: ${uniqueUsers.length}`);
    
    // Проверяем типы данных у активных пользователей
    console.log('\n   Типы данных активных пользователей:');
    for (const userId of uniqueUsers.slice(0, 5)) {
      const user = await supabase.from('users').select('id').eq('id', userId).single();
      const farming = await supabase.from('ton_farming_data').select('user_id').eq('user_id', userId).single();
      
      if (user.data && farming.data) {
        console.log(`   • User ${userId}: users.id (${typeof user.data.id}) + farming.user_id (${typeof farming.data.user_id})`);
      }
    }
  }

  // 6. Рекомендации по решению
  console.log('\n6. 💡 РЕКОМЕНДАЦИИ ПО РЕШЕНИЮ:');
  console.log('═'.repeat(50));
  
  if (joinFailures && joinFailures.length > 0) {
    console.log(`❌ ПРОБЛЕМА ПОДТВЕРЖДЕНА: ${joinFailures.length} пользователей не проходят JOIN`);
    console.log('\n🛠️ ВАРИАНТЫ РЕШЕНИЯ:');
    console.log('\n   1️⃣ БЫСТРОЕ ИСПРАВЛЕНИЕ (рекомендуется):');
    console.log('      Модифицировать планировщик для приведения типов');
    console.log('      Добавить CAST(user_id AS INTEGER) в JOIN запросы');
    console.log('\n   2️⃣ ДОЛГОСРОЧНОЕ РЕШЕНИЕ:');
    console.log('      Исправить схему БД - привести все user_id к INTEGER');
    console.log('\n   3️⃣ КОМПЕНСАЦИЯ:');
    console.log('      Выявить пострадавших пользователей и компенсировать потери');
  } else {
    console.log('✅ Проблем с JOIN не обнаружено - возможна другая причина');
  }

  console.log('\n✅ Анализ истории типов данных завершен');
}

// Запуск
analyzeDataTypeHistory()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });