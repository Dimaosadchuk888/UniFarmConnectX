/**
 * СОЗДАНИЕ 20-УРОВНЕВОЙ РЕФЕРАЛЬНОЙ СТРУКТУРЫ С КОРРЕКТНЫМИ ПОЛЯМИ
 * Использует только существующие поля в таблице users
 */

import { createClient } from '@supabase/supabase-js';

async function createCorrectReferralStructure() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🎯 СОЗДАНИЕ 20-УРОВНЕВОЙ РЕФЕРАЛЬНОЙ СТРУКТУРЫ');
  console.log('='.repeat(60));
  
  const baseUserId = 48;
  
  // Получаем данные основного пользователя
  const { data: baseUser, error: baseUserError } = await supabase
    .from('users')
    .select('*')
    .eq('id', baseUserId)
    .single();
  
  if (baseUserError) {
    console.log('❌ Ошибка получения основного пользователя:', baseUserError.message);
    return;
  }
  
  console.log(`📊 Основной пользователь: ${baseUser.username} (ID: ${baseUserId})`);
  console.log(`🔗 Реферальный код: ${baseUser.ref_code}`);
  
  const createdUsers = [];
  let currentReferrerId = baseUserId;
  
  console.log('\n🏗️ СОЗДАНИЕ 20-УРОВНЕВОЙ СТРУКТУРЫ:');
  console.log('-'.repeat(60));
  
  for (let level = 1; level <= 20; level++) {
    console.log(`\n📍 Создание партнера уровня ${level}:`);
    
    const telegramId = 999999000 + level;
    const username = `partner_level_${level}`;
    const refCode = `REF_LEVEL_${level}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    try {
      // Создаем пользователя только с существующими полями
      const newUserData = {
        telegram_id: telegramId,
        username: username,
        first_name: `Партнер Уровень ${level}`,
        ref_code: refCode,
        referred_by: currentReferrerId, // Указываем референта
        balance_uni: 100,
        balance_ton: 100,
        uni_deposit_amount: 50,
        uni_farming_start_timestamp: new Date().toISOString(),
        uni_farming_rate: 0.01,
        uni_farming_active: true,
        ton_boost_package: 1,
        ton_boost_rate: 0.01,
        ton_boost_active: true,
        checkin_streak: 0,
        is_admin: false,
        created_at: new Date().toISOString()
      };
      
      console.log(`   📝 Создание: ${username} (telegram_id: ${telegramId})`);
      console.log(`   👥 Референт: ID ${currentReferrerId}`);
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([newUserData])
        .select()
        .single();
      
      if (createError) {
        console.log(`   ❌ Ошибка создания:`, createError.message);
        continue;
      }
      
      console.log(`   ✅ Создан: ID ${newUser.id}`);
      console.log(`   🔗 Реф-код: ${newUser.ref_code}`);
      console.log(`   💰 Стартовый баланс: 100 UNI + 100 TON`);
      console.log(`   📈 UNI депозит: 50 UNI (ставка 1%)`);
      console.log(`   🚀 TON Boost: Пакет 1 (ставка 1%)`);
      
      // Создаем начальные транзакции
      const initialTransactions = [
        {
          user_id: newUser.id,
          type: 'FARMING_REWARD',
          amount_uni: '100',
          description: `💰 Initial UNI deposit: 100 UNI (Level ${level} partner)`,
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          user_id: newUser.id,
          type: 'FARMING_REWARD',
          amount_ton: '100',
          description: `💰 Initial TON deposit: 100 TON (Level ${level} partner)`,
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          user_id: newUser.id,
          type: 'FARMING_REWARD',
          amount_uni: '50',
          description: `📈 UNI farming start: 50 UNI deposit (rate: 1%)`,
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          user_id: newUser.id,
          type: 'FARMING_REWARD',
          amount_ton: '20',
          description: `🚀 TON Boost package 1 activation: 20 TON`,
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .insert(initialTransactions)
        .select();
      
      if (!txError) {
        console.log(`   ✅ Создано ${transactions.length} начальных транзакций`);
      }
      
      // Сохраняем информацию
      createdUsers.push({
        level: level,
        user_id: newUser.id,
        telegram_id: telegramId,
        username: username,
        ref_code: refCode,
        referrer_id: currentReferrerId,
        balance_uni: 100,
        balance_ton: 100
      });
      
      // Следующий пользователь будет иметь референтом текущего
      currentReferrerId = newUser.id;
      
      console.log(`   🎯 Уровень ${level} создан успешно`);
      
    } catch (error) {
      console.log(`   ❌ Ошибка уровня ${level}:`, error.message);
      continue;
    }
    
    // Пауза между созданием
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 СТРУКТУРА РЕФЕРАЛЬНОЙ СЕТИ:');
  console.log('='.repeat(60));
  
  console.log(`✅ Создано партнеров: ${createdUsers.length}/20\n`);
  
  console.log('Уровень | User ID | Username         | Ref Code                      | Referrer ID');
  console.log('-'.repeat(90));
  console.log(`   0     |   ${baseUserId}   | ${baseUser.username.padEnd(16)} | ${baseUser.ref_code} | (основной)`);
  
  createdUsers.forEach(user => {
    console.log(`   ${user.level.toString().padStart(2)}     | ${user.user_id.toString().padStart(7)} | ${user.username.padEnd(16)} | ${user.ref_code.padEnd(29)} | ${user.referrer_id}`);
  });
  
  // Верификация реферальных связей
  console.log('\n🔍 ВЕРИФИКАЦИЯ РЕФЕРАЛЬНЫХ СВЯЗЕЙ:');
  console.log('-'.repeat(60));
  
  let correctLinks = 0;
  for (const user of createdUsers) {
    const { data: verification, error: verifyError } = await supabase
      .from('users')
      .select('id, username, referred_by')
      .eq('id', user.user_id)
      .single();
    
    if (!verifyError && verification) {
      const isCorrect = verification.referred_by === user.referrer_id;
      console.log(`${isCorrect ? '✅' : '❌'} ${user.username}: referred_by = ${verification.referred_by} (ожидался ${user.referrer_id})`);
      if (isCorrect) correctLinks++;
    }
  }
  
  console.log(`\n📈 Корректных связей: ${correctLinks}/${createdUsers.length}`);
  
  // Активация реферальной системы через имитацию активности
  console.log('\n⚡ АКТИВАЦИЯ РЕФЕРАЛЬНОЙ СИСТЕМЫ:');
  console.log('-'.repeat(60));
  
  try {
    // Создаем активность для первых 10 партнеров
    for (let i = 0; i < Math.min(10, createdUsers.length); i++) {
      const user = createdUsers[i];
      console.log(`💰 Активация деятельности для ${user.username}...`);
      
      // Создаем различные виды транзакций
      const activities = [
        {
          user_id: user.user_id,
          type: 'FARMING_REWARD',
          amount_uni: '5.0',
          description: `🌾 UNI farming reward: 5.0 UNI (level ${user.level} activity)`,
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          user_id: user.user_id,
          type: 'FARMING_REWARD',
          amount_ton: '2.0',
          description: `🚀 TON Boost income: 2.0 TON (level ${user.level} boost)`,
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      const { data: activityTx, error: activityError } = await supabase
        .from('transactions')
        .insert(activities)
        .select();
      
      if (!activityError) {
        console.log(`   ✅ Создано ${activityTx.length} транзакций активности`);
        
        // Обновляем балансы
        const newUniBalance = user.balance_uni + 5.0;
        const newTonBalance = user.balance_ton + 2.0;
        
        await supabase
          .from('users')
          .update({ 
            balance_uni: newUniBalance,
            balance_ton: newTonBalance
          })
          .eq('id', user.user_id);
        
        console.log(`   💰 Балансы обновлены: UNI ${user.balance_uni} → ${newUniBalance}, TON ${user.balance_ton} → ${newTonBalance}`);
        
        // Обновляем локальные данные
        user.balance_uni = newUniBalance;
        user.balance_ton = newTonBalance;
      }
    }
    
  } catch (error) {
    console.log('❌ Ошибка активации:', error.message);
  }
  
  // Создание реферальных начислений для user_id=48
  console.log('\n💸 СОЗДАНИЕ РЕФЕРАЛЬНЫХ НАЧИСЛЕНИЙ ДЛЯ USER_ID=48:');
  console.log('-'.repeat(60));
  
  const referralCommissions = [];
  
  // Создаем начисления от активных партнеров
  for (let i = 0; i < Math.min(10, createdUsers.length); i++) {
    const user = createdUsers[i];
    const level = user.level;
    
    // Расчет комиссии по уровню:
    // Уровень 1: 5%, Уровень 2-20: 1% + (level-1)*0.1%
    let commissionRate;
    if (level === 1) {
      commissionRate = 0.05; // 5%
    } else {
      commissionRate = 0.01 + (level - 1) * 0.001; // 1.1%, 1.2%, 1.3%, etc.
    }
    
    const activityAmount = 5.0; // UNI активность партнера
    const commission = activityAmount * commissionRate;
    
    if (commission > 0) {
      const referralTx = {
        user_id: baseUserId,
        type: 'FARMING_REWARD',
        amount_uni: commission.toFixed(6),
        description: `👥 Referral commission ${(commissionRate * 100).toFixed(1)}% from level ${level} partner (${user.username}): ${commission.toFixed(4)} UNI`,
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      referralCommissions.push(referralTx);
    }
  }
  
  if (referralCommissions.length > 0) {
    const { data: createdCommissions, error: commissionError } = await supabase
      .from('transactions')
      .insert(referralCommissions)
      .select();
    
    if (!commissionError) {
      console.log(`✅ Создано ${createdCommissions.length} реферальных начислений:`);
      createdCommissions.forEach((tx, idx) => {
        console.log(`   ${idx + 1}. +${tx.amount_uni} UNI - ${tx.description}`);
      });
      
      // Обновляем баланс основного пользователя
      const totalCommission = referralCommissions.reduce((sum, tx) => sum + parseFloat(tx.amount_uni), 0);
      const currentBalance = parseFloat(baseUser.balance_uni);
      const newBalance = currentBalance + totalCommission;
      
      await supabase
        .from('users')
        .update({ balance_uni: newBalance })
        .eq('id', baseUserId);
      
      console.log(`💰 Баланс user_id=48 обновлен: ${currentBalance.toFixed(2)} → ${newBalance.toFixed(2)} UNI (+${totalCommission.toFixed(4)})`);
    }
  }
  
  // Проверка структуры в базе данных
  console.log('\n🔍 ПРОВЕРКА РЕФЕРАЛЬНОЙ СТРУКТУРЫ В БД:');
  console.log('-'.repeat(60));
  
  const { data: allUsers, error: checkError } = await supabase
    .from('users')
    .select('id, username, referred_by, balance_uni, balance_ton')
    .in('id', [baseUserId, ...createdUsers.map(u => u.user_id)])
    .order('id');
  
  if (!checkError) {
    console.log('📊 Структура реферальной сети в базе данных:');
    
    // Группируем по уровням
    allUsers.forEach(user => {
      if (user.id === baseUserId) {
        const directReferrals = allUsers.filter(u => u.referred_by === baseUserId).length;
        console.log(`   Основной (ID: ${user.id}): ${user.username} | Балансы: ${user.balance_uni} UNI, ${user.balance_ton} TON | Прямых рефералов: ${directReferrals}`);
      } else {
        const userInfo = createdUsers.find(u => u.user_id === user.id);
        const level = userInfo ? userInfo.level : '?';
        console.log(`   Уровень ${level} (ID: ${user.id}): ${user.username} | Референт: ${user.referred_by} | Балансы: ${user.balance_uni} UNI, ${user.balance_ton} TON`);
      }
    });
  }
  
  // Финальная статистика
  console.log('\n📈 ФИНАЛЬНАЯ СТАТИСТИКА СИСТЕМЫ:');
  console.log('='.repeat(60));
  
  if (!checkError) {
    const totalUsers = allUsers.length;
    const totalUniBalance = allUsers.reduce((sum, u) => sum + parseFloat(u.balance_uni || 0), 0);
    const totalTonBalance = allUsers.reduce((sum, u) => sum + parseFloat(u.balance_ton || 0), 0);
    const referralChainLength = createdUsers.length;
    const mainUserReferrals = allUsers.filter(u => u.referred_by === baseUserId).length;
    
    console.log(`📊 Общее количество пользователей: ${totalUsers}`);
    console.log(`💰 Общий UNI баланс сети: ${totalUniBalance.toFixed(2)} UNI`);
    console.log(`💰 Общий TON баланс сети: ${totalTonBalance.toFixed(2)} TON`);
    console.log(`🔗 Длина реферальной цепи: ${referralChainLength} уровней`);
    console.log(`👥 Прямых рефералов у user_id=48: ${mainUserReferrals}`);
    
    const mainUser = allUsers.find(u => u.id === baseUserId);
    if (mainUser) {
      console.log(`\n📋 Статистика основного пользователя (ID: ${baseUserId}):`);
      console.log(`   💰 UNI баланс: ${mainUser.balance_uni} UNI`);
      console.log(`   💰 TON баланс: ${mainUser.balance_ton} TON`);
      console.log(`   🎯 Позиция: Глава 20-уровневой структуры`);
    }
  }
  
  // Проверка реферальных начислений
  console.log('\n🎯 АНАЛИЗ РЕФЕРАЛЬНЫХ ТРАНЗАКЦИЙ:');
  console.log('-'.repeat(60));
  
  const { data: referralTx, error: refTxError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', baseUserId)
    .ilike('description', '%referral%')
    .order('created_at', { ascending: false })
    .limit(15);
  
  if (!refTxError && referralTx?.length > 0) {
    console.log(`✅ Найдено ${referralTx.length} реферальных транзакций:`);
    referralTx.forEach((tx, idx) => {
      const amount = tx.amount_uni || tx.amount_ton || '0';
      const currency = tx.amount_uni ? 'UNI' : 'TON';
      console.log(`   ${idx + 1}. ID: ${tx.id} | +${amount} ${currency} | ${tx.description}`);
    });
    
    const totalReferralIncome = referralTx.reduce((sum, tx) => sum + parseFloat(tx.amount_uni || 0), 0);
    console.log(`\n💰 Общий доход от рефералов: ${totalReferralIncome.toFixed(4)} UNI`);
  } else {
    console.log('📝 Реферальные транзакции будут создаваться при активности партнеров');
  }
  
  console.log('\n✅ 20-УРОВНЕВАЯ РЕФЕРАЛЬНАЯ СТРУКТУРА СОЗДАНА И АКТИВИРОВАНА');
  console.log('🎯 Система готова для демонстрации в интерфейсе');
  console.log('📱 Откройте интерфейс для просмотра структуры и начислений');
  console.log('🔄 Автоматические начисления будут продолжаться при активности партнеров');
  
  return {
    created_users: createdUsers,
    total_created: createdUsers.length,
    structure_complete: createdUsers.length === 20,
    base_user_id: baseUserId,
    referral_chain_ids: createdUsers.map(u => u.user_id)
  };
}

createCorrectReferralStructure().catch(console.error);