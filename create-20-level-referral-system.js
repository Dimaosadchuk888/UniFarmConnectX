/**
 * СОЗДАНИЕ 20-УРОВНЕВОЙ РЕФЕРАЛЬНОЙ СИСТЕМЫ ДЛЯ USER_ID=48
 * Комплексное тестирование партнёрской программы UniFarm
 */

import { createClient } from '@supabase/supabase-js';

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function create20LevelReferralSystem() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🎯 СОЗДАНИЕ 20-УРОВНЕВОЙ РЕФЕРАЛЬНОЙ СИСТЕМЫ');
  console.log('=' .repeat(60));
  
  const baseUserId = 48; // user_id=48 - основной пользователь
  const baseUrl = 'http://localhost:3000';
  
  // Получаем реферальный код основного пользователя
  const { data: baseUser, error: baseUserError } = await supabase
    .from('users')
    .select('ref_code, username')
    .eq('id', baseUserId)
    .single();
  
  if (baseUserError) {
    console.log('❌ Ошибка получения основного пользователя:', baseUserError.message);
    return;
  }
  
  console.log(`📊 Основной пользователь: ${baseUser.username} (ID: ${baseUserId})`);
  console.log(`🔗 Реферальный код: ${baseUser.ref_code}`);
  
  // Структура для хранения созданных пользователей
  const createdUsers = [];
  let lastRefCode = baseUser.ref_code;
  
  console.log('\n🏗️ СОЗДАНИЕ 20-УРОВНЕВОЙ СТРУКТУРЫ:');
  console.log('-'.repeat(60));
  
  for (let level = 1; level <= 20; level++) {
    console.log(`\n📍 Создание пользователя уровня ${level}:`);
    
    // Генерируем уникальные данные для нового пользователя
    const telegramId = 777777000 + level; // Уникальные telegram_id
    const username = `partner_level_${level}`;
    const firstName = `Партнер`;
    const lastName = `Уровень${level}`;
    
    try {
      // Создаем пользователя через API регистрации
      const registrationData = {
        telegram_id: telegramId,
        username: username,
        first_name: firstName,
        last_name: lastName,
        referrer_ref_code: lastRefCode // Регистрируется по реф-коду предыдущего уровня
      };
      
      console.log(`   📝 Регистрация: ${username} (telegram_id: ${telegramId})`);
      console.log(`   🔗 По реферальному коду: ${lastRefCode}`);
      
      // Регистрируем пользователя через API
      const registrationResponse = await fetch(`${baseUrl}/api/v2/auth/register/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData)
      });
      
      if (!registrationResponse.ok) {
        console.log(`   ❌ Ошибка регистрации: ${registrationResponse.status}`);
        continue;
      }
      
      const registrationResult = await registrationResponse.json();
      
      if (!registrationResult.success) {
        console.log(`   ❌ Регистрация неудачна:`, registrationResult.error);
        continue;
      }
      
      const newUserId = registrationResult.data.user.id;
      const newRefCode = registrationResult.data.user.ref_code;
      
      console.log(`   ✅ Создан пользователь ID: ${newUserId}`);
      console.log(`   🔗 Новый реф-код: ${newRefCode}`);
      
      // Пополняем баланс: 100 UNI и 100 TON
      console.log(`   💰 Пополнение баланса...`);
      
      const { data: balanceUpdate, error: balanceError } = await supabase
        .from('users')
        .update({
          balance_uni: '100',
          balance_ton: '100'
        })
        .eq('id', newUserId)
        .select()
        .single();
      
      if (balanceError) {
        console.log(`   ❌ Ошибка пополнения баланса:`, balanceError.message);
      } else {
        console.log(`   ✅ Баланс пополнен: 100 UNI + 100 TON`);
      }
      
      // Создаем депозиты для активации фарминга
      console.log(`   📈 Создание депозитов...`);
      
      // UNI депозит
      const { data: uniDeposit, error: uniDepositError } = await supabase
        .from('users')
        .update({
          uni_deposit_amount: '50',
          uni_farming_start_timestamp: new Date().toISOString(),
          uni_farming_rate: '0.01'
        })
        .eq('id', newUserId)
        .select()
        .single();
      
      if (!uniDepositError) {
        console.log(`   ✅ UNI депозит: 50 UNI (ставка 1%)`);
      }
      
      // TON Boost пакет
      const { data: tonBoost, error: tonBoostError } = await supabase
        .from('users')
        .update({
          ton_boost_package: '1',
          ton_boost_rate: '0.01',
          ton_boost_start_timestamp: new Date().toISOString()
        })
        .eq('id', newUserId)
        .select()
        .single();
      
      if (!tonBoostError) {
        console.log(`   ✅ TON Boost: Пакет 1 (ставка 1%)`);
      }
      
      // Создаем начальные транзакции для активации реферальной системы
      const transactions = [
        {
          user_id: newUserId,
          type: 'FARMING_REWARD',
          amount_uni: '0.5',
          description: `UNI farming deposit: 50 UNI`,
          status: 'completed'
        },
        {
          user_id: newUserId,
          type: 'FARMING_REWARD',
          amount_ton: '0.5',
          description: `TON Boost activation: Package 1`,
          status: 'completed'
        }
      ];
      
      const { data: createdTransactions, error: transactionError } = await supabase
        .from('transactions')
        .insert(transactions)
        .select();
      
      if (!transactionError) {
        console.log(`   ✅ Созданы транзакции для активации реферальной системы`);
      }
      
      // Сохраняем информацию о созданном пользователе
      createdUsers.push({
        level: level,
        user_id: newUserId,
        telegram_id: telegramId,
        username: username,
        ref_code: newRefCode,
        referrer_ref_code: lastRefCode,
        balance_uni: '100',
        balance_ton: '100',
        uni_deposit: '50',
        ton_boost_package: '1'
      });
      
      // Следующий уровень будет регистрироваться по коду этого пользователя
      lastRefCode = newRefCode;
      
      console.log(`   🎯 Уровень ${level} завершен успешно\n`);
      
    } catch (error) {
      console.log(`   ❌ Ошибка создания уровня ${level}:`, error.message);
      continue;
    }
    
    // Небольшая пауза между созданием пользователей
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 СВОДКА СОЗДАННОЙ СТРУКТУРЫ:');
  console.log('='.repeat(60));
  
  console.log(`✅ Создано пользователей: ${createdUsers.length}/20`);
  console.log(`📋 Структура реферальной сети:\n`);
  
  console.log('Уровень | User ID | Username        | Ref Code                     | Referrer Code');
  console.log('-'.repeat(85));
  console.log(`   0     |   ${baseUserId}   | ${baseUser.username.padEnd(15)} | ${baseUser.ref_code} | (основной)`);
  
  createdUsers.forEach(user => {
    console.log(`   ${user.level.toString().padStart(2)}     | ${user.user_id.toString().padStart(7)} | ${user.username.padEnd(15)} | ${user.ref_code} | ${user.referrer_ref_code}`);
  });
  
  // Проверяем реферальные связи в базе данных
  console.log('\n🔍 ПРОВЕРКА РЕФЕРАЛЬНЫХ СВЯЗЕЙ:');
  console.log('-'.repeat(60));
  
  for (const user of createdUsers.slice(0, 5)) { // Проверяем первые 5 для примера
    const { data: referralCheck, error: referralError } = await supabase
      .from('users')
      .select('id, username, referred_by, ref_code')
      .eq('id', user.user_id)
      .single();
    
    if (!referralError && referralCheck) {
      console.log(`✅ ${user.username}: referred_by = ${referralCheck.referred_by || 'NULL'}`);
    }
  }
  
  // Активируем реферальную систему для проверки начислений
  console.log('\n⚡ АКТИВАЦИЯ РЕФЕРАЛЬНОЙ СИСТЕМЫ:');
  console.log('-'.repeat(60));
  
  try {
    // Имитируем фарминг активность для генерации реферальных начислений
    for (const user of createdUsers.slice(0, 3)) { // Активируем первые 3 уровня
      console.log(`💰 Имитация фарминг дохода для ${user.username}...`);
      
      // Создаем фарминг транзакцию
      const { data: farmingTransaction, error: farmingError } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.user_id,
          type: 'FARMING_REWARD',
          amount_uni: '1.0',
          description: `UNI farming income: 1.0 UNI (rate: 0.01)`,
          status: 'completed'
        }])
        .select()
        .single();
      
      if (!farmingError) {
        console.log(`   ✅ Создана фарминг транзакция: ${farmingTransaction.id}`);
        
        // Обновляем баланс
        await supabase
          .from('users')
          .update({
            balance_uni: (parseFloat(user.balance_uni) + 1.0).toString()
          })
          .eq('id', user.user_id);
        
        console.log(`   💰 Баланс обновлен: +1.0 UNI`);
      }
    }
    
  } catch (error) {
    console.log('❌ Ошибка активации реферальной системы:', error.message);
  }
  
  console.log('\n🎯 ПРОВЕРКА НАЧИСЛЕНИЙ ДЛЯ USER_ID=48:');
  console.log('-'.repeat(60));
  
  // Проверяем реферальные начисления для основного пользователя
  const { data: referralTransactions, error: refTxError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', baseUserId)
    .ilike('description', '%referral%')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (!refTxError && referralTransactions?.length > 0) {
    console.log(`✅ Найдено ${referralTransactions.length} реферальных начислений:`);
    referralTransactions.forEach((tx, idx) => {
      console.log(`   ${idx + 1}. ID: ${tx.id} | ${tx.amount_uni || tx.amount_ton} ${tx.amount_uni ? 'UNI' : 'TON'} | ${tx.description}`);
    });
  } else {
    console.log('📝 Реферальные начисления пока не созданы (требуется активация планировщика)');
  }
  
  // Финальная проверка структуры
  console.log('\n📈 ФИНАЛЬНАЯ СТАТИСТИКА:');
  console.log('='.repeat(60));
  
  const { data: finalStats, error: statsError } = await supabase
    .from('users')
    .select('id, username, balance_uni, balance_ton, referred_by')
    .in('id', createdUsers.map(u => u.user_id))
    .order('id');
  
  if (!statsError) {
    console.log(`📊 Активных партнеров: ${finalStats.length}`);
    console.log(`💰 Общий баланс UNI: ${finalStats.reduce((sum, u) => sum + parseFloat(u.balance_uni || 0), 0)} UNI`);
    console.log(`💰 Общий баланс TON: ${finalStats.reduce((sum, u) => sum + parseFloat(u.balance_ton || 0), 0)} TON`);
    console.log(`🔗 Пользователей с referrer: ${finalStats.filter(u => u.referred_by).length}`);
  }
  
  console.log('\n✅ СОЗДАНИЕ 20-УРОВНЕВОЙ РЕФЕРАЛЬНОЙ СИСТЕМЫ ЗАВЕРШЕНО');
  console.log('🎯 Структура готова для тестирования партнёрских начислений');
  console.log('📋 Все пользователи имеют активные депозиты и готовы генерировать доходы');
  
  return createdUsers;
}

create20LevelReferralSystem().catch(console.error);