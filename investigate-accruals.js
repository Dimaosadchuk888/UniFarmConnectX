/**
 * ИССЛЕДОВАНИЕ РЕЗУЛЬТАТОВ НАЧИСЛЕНИЙ
 * Проверка состояния системы после создания реферальной структуры
 */

import { createClient } from '@supabase/supabase-js';

async function investigateAccruals() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🔍 ИССЛЕДОВАНИЕ РЕЗУЛЬТАТОВ НАЧИСЛЕНИЙ');
  console.log('='.repeat(60));
  
  const baseUserId = 48;
  
  // 1. ПРОВЕРКА ОСНОВНОГО ПОЛЬЗОВАТЕЛЯ
  console.log('\n📊 1. СОСТОЯНИЕ ОСНОВНОГО ПОЛЬЗОВАТЕЛЯ (ID: 48):');
  console.log('-'.repeat(50));
  
  const { data: mainUser, error: mainError } = await supabase
    .from('users')
    .select('*')
    .eq('id', baseUserId)
    .single();
  
  if (mainError) {
    console.log('❌ Ошибка получения основного пользователя:', mainError.message);
    return;
  }
  
  console.log(`👤 Пользователь: ${mainUser.username} (ID: ${baseUserId})`);
  console.log(`💰 Текущие балансы: ${parseFloat(mainUser.balance_uni).toFixed(2)} UNI, ${parseFloat(mainUser.balance_ton).toFixed(6)} TON`);
  console.log(`📈 UNI фарминг: ${mainUser.uni_farming_active ? 'Активен' : 'Неактивен'} (депозит: ${mainUser.uni_deposit_amount} UNI, ставка: ${(mainUser.uni_farming_rate * 100).toFixed(2)}%)`);
  console.log(`🚀 TON Boost: Пакет ${mainUser.ton_boost_package} (ставка: ${(mainUser.ton_boost_rate * 100).toFixed(1)}%)`);
  console.log(`🔗 Реферальный код: ${mainUser.ref_code}`);
  
  // 2. АНАЛИЗ ПОСЛЕДНИХ ТРАНЗАКЦИЙ
  console.log('\n💰 2. ПОСЛЕДНИЕ ТРАНЗАКЦИИ ОСНОВНОГО ПОЛЬЗОВАТЕЛЯ:');
  console.log('-'.repeat(50));
  
  const { data: recentTransactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', baseUserId)
    .order('created_at', { ascending: false })
    .limit(15);
  
  if (!txError && recentTransactions?.length > 0) {
    console.log(`✅ Найдено транзакций: ${recentTransactions.length}`);
    
    recentTransactions.forEach((tx, idx) => {
      const amount = tx.amount_uni || tx.amount_ton || '0';
      const currency = tx.amount_uni ? 'UNI' : 'TON';
      const dateStr = new Date(tx.created_at).toLocaleString('ru-RU');
      console.log(`   ${idx + 1}. [${dateStr}] ID: ${tx.id} | +${amount} ${currency} | ${tx.description}`);
    });
    
    // Анализ по типам
    const farmingRewards = recentTransactions.filter(tx => tx.description.includes('farming') || tx.description.includes('Farming'));
    const referralRewards = recentTransactions.filter(tx => tx.description.includes('referral') || tx.description.includes('Referral'));
    const tonBoostRewards = recentTransactions.filter(tx => tx.description.includes('TON Boost') || tx.description.includes('Boost'));
    const dailyBonus = recentTransactions.filter(tx => tx.description.includes('Daily') || tx.description.includes('daily'));
    
    console.log(`\n📈 Анализ по типам:`);
    console.log(`   🌾 UNI Farming: ${farmingRewards.length} транзакций`);
    console.log(`   👥 Реферальные: ${referralRewards.length} транзакций`);
    console.log(`   🚀 TON Boost: ${tonBoostRewards.length} транзакций`);
    console.log(`   🎁 Daily Bonus: ${dailyBonus.length} транзакций`);
    
  } else {
    console.log('📝 Транзакции не найдены');
  }
  
  // 3. ПРОВЕРКА РЕФЕРАЛЬНЫХ НАЧИСЛЕНИЙ
  console.log('\n👥 3. РЕФЕРАЛЬНЫЕ НАЧИСЛЕНИЯ:');
  console.log('-'.repeat(50));
  
  const { data: referralTx, error: refError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', baseUserId)
    .ilike('description', '%referral%')
    .order('created_at', { ascending: false });
  
  if (!refError && referralTx?.length > 0) {
    console.log(`✅ Реферальных начислений: ${referralTx.length}`);
    
    referralTx.forEach((tx, idx) => {
      const amount = tx.amount_uni || tx.amount_ton || '0';
      const currency = tx.amount_uni ? 'UNI' : 'TON';
      const dateStr = new Date(tx.created_at).toLocaleString('ru-RU');
      console.log(`   ${idx + 1}. [${dateStr}] +${amount} ${currency} | ${tx.description}`);
    });
    
    const totalReferralUni = referralTx.reduce((sum, tx) => sum + parseFloat(tx.amount_uni || 0), 0);
    const totalReferralTon = referralTx.reduce((sum, tx) => sum + parseFloat(tx.amount_ton || 0), 0);
    
    console.log(`\n💰 Общий доход от рефералов: ${totalReferralUni.toFixed(4)} UNI + ${totalReferralTon.toFixed(6)} TON`);
  } else {
    console.log('📝 Реферальные начисления не найдены');
  }
  
  // 4. ПРОВЕРКА СОСТОЯНИЯ ПАРТНЕРОВ
  console.log('\n🤝 4. СОСТОЯНИЕ ПАРТНЕРОВ:');
  console.log('-'.repeat(50));
  
  const { data: partners, error: partnersError } = await supabase
    .from('users')
    .select('id, username, telegram_id, referred_by, balance_uni, balance_ton, uni_farming_active, ton_boost_package')
    .gte('telegram_id', 999999000)
    .order('id');
  
  if (!partnersError && partners?.length > 0) {
    console.log(`✅ Найдено партнеров: ${partners.length}`);
    
    // Проверяем прямых рефералов
    const directReferrals = partners.filter(p => p.referred_by === baseUserId);
    console.log(`👥 Прямых рефералов у user_id=${baseUserId}: ${directReferrals.length}`);
    
    if (directReferrals.length > 0) {
      directReferrals.forEach((ref, idx) => {
        console.log(`   ${idx + 1}. ID: ${ref.id} | ${ref.username} | Балансы: ${ref.balance_uni} UNI, ${ref.balance_ton} TON | UNI фарминг: ${ref.uni_farming_active ? 'Да' : 'Нет'} | TON Boost: ${ref.ton_boost_package || 'Нет'}`);
      });
    }
    
    // Активность партнеров
    const activeUniPartners = partners.filter(p => p.uni_farming_active === true).length;
    const tonBoostPartners = partners.filter(p => p.ton_boost_package && p.ton_boost_package > 0).length;
    const totalPartnerUni = partners.reduce((sum, p) => sum + parseFloat(p.balance_uni || 0), 0);
    const totalPartnerTon = partners.reduce((sum, p) => sum + parseFloat(p.balance_ton || 0), 0);
    
    console.log(`\n📊 Статистика партнеров:`);
    console.log(`   🌾 Активных UNI фармеров: ${activeUniPartners}/${partners.length}`);
    console.log(`   🚀 С TON Boost пакетами: ${tonBoostPartners}/${partners.length}`);
    console.log(`   💰 Общие балансы партнеров: ${totalPartnerUni.toFixed(2)} UNI + ${totalPartnerTon.toFixed(2)} TON`);
    
  } else {
    console.log('📝 Партнеры не найдены');
  }
  
  // 5. АКТИВНОСТЬ ПАРТНЕРОВ В ТРАНЗАКЦИЯХ
  console.log('\n💸 5. АКТИВНОСТЬ ПАРТНЕРОВ В ТРАНЗАКЦИЯХ:');
  console.log('-'.repeat(50));
  
  if (partners?.length > 0) {
    const partnerIds = partners.map(p => p.id);
    
    const { data: partnerTransactions, error: partnerTxError } = await supabase
      .from('transactions')
      .select('user_id, type, amount_uni, amount_ton, description, created_at')
      .in('user_id', partnerIds)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (!partnerTxError && partnerTransactions?.length > 0) {
      console.log(`✅ Найдено транзакций партнеров: ${partnerTransactions.length}`);
      
      // Группируем по пользователям
      const activityByUser = {};
      partnerTransactions.forEach(tx => {
        if (!activityByUser[tx.user_id]) {
          activityByUser[tx.user_id] = {
            count: 0,
            uniTotal: 0,
            tonTotal: 0,
            transactions: []
          };
        }
        activityByUser[tx.user_id].count++;
        activityByUser[tx.user_id].uniTotal += parseFloat(tx.amount_uni || 0);
        activityByUser[tx.user_id].tonTotal += parseFloat(tx.amount_ton || 0);
        activityByUser[tx.user_id].transactions.push(tx);
      });
      
      Object.keys(activityByUser).forEach(userId => {
        const partner = partners.find(p => p.id == userId);
        const activity = activityByUser[userId];
        
        if (partner) {
          console.log(`   ${partner.username} (ID: ${userId}):`);
          console.log(`     📊 Транзакций: ${activity.count} | Сумма: ${activity.uniTotal.toFixed(2)} UNI + ${activity.tonTotal.toFixed(6)} TON`);
          
          // Показываем последние 3 транзакции
          activity.transactions.slice(0, 3).forEach((tx, idx) => {
            const amount = tx.amount_uni || tx.amount_ton || '0';
            const currency = tx.amount_uni ? 'UNI' : 'TON';
            const dateStr = new Date(tx.created_at).toLocaleString('ru-RU');
            console.log(`       ${idx + 1}. [${dateStr}] +${amount} ${currency} | ${tx.description.substring(0, 40)}...`);
          });
          console.log('');
        }
      });
      
      const activePartners = Object.keys(activityByUser).length;
      console.log(`📈 Активных партнеров: ${activePartners}/${partners.length}`);
      
    } else {
      console.log('📝 Транзакции партнеров не найдены');
    }
  }
  
  // 6. ПРОВЕРКА ПЛАНИРОВЩИКОВ
  console.log('\n⚙️ 6. ПОТЕНЦИАЛЬНЫЕ НАЧИСЛЕНИЯ ПЛАНИРОВЩИКОВ:');
  console.log('-'.repeat(50));
  
  // Проверяем, сколько пользователей должны получать начисления
  const { data: uniFarmers, error: uniError } = await supabase
    .from('users')
    .select('id, username, balance_uni, uni_deposit_amount, uni_farming_rate, uni_farming_start_timestamp')
    .eq('uni_farming_active', true)
    .gt('uni_deposit_amount', 0);
  
  if (!uniError && uniFarmers?.length > 0) {
    console.log(`🌾 UNI фармеры (должны получать начисления каждые 5 минут):`);
    console.log(`   Всего активных: ${uniFarmers.length}`);
    
    uniFarmers.slice(0, 5).forEach((farmer, idx) => {
      const expectedIncome = (parseFloat(farmer.uni_deposit_amount) * parseFloat(farmer.uni_farming_rate) / 288).toFixed(6);
      console.log(`   ${idx + 1}. ${farmer.username} (ID: ${farmer.id}) | Депозит: ${farmer.uni_deposit_amount} UNI | Ожидаемый доход за цикл: ${expectedIncome} UNI`);
    });
    
    if (uniFarmers.length > 5) {
      console.log(`   ... и еще ${uniFarmers.length - 5} фармеров`);
    }
  }
  
  const { data: tonBoosters, error: tonError } = await supabase
    .from('users')
    .select('id, username, balance_ton, ton_boost_package, ton_boost_rate')
    .gt('ton_boost_package', 0)
    .gt('ton_boost_rate', 0);
  
  if (!tonError && tonBoosters?.length > 0) {
    console.log(`\n🚀 TON Boost пользователи (должны получать начисления каждые 5 минут):`);
    console.log(`   Всего активных: ${tonBoosters.length}`);
    
    tonBoosters.slice(0, 5).forEach((booster, idx) => {
      const expectedIncome = (parseFloat(booster.balance_ton) * parseFloat(booster.ton_boost_rate) / 288 / 365).toFixed(8);
      console.log(`   ${idx + 1}. ${booster.username} (ID: ${booster.id}) | Баланс: ${booster.balance_ton} TON | Пакет: ${booster.ton_boost_package} | Ожидаемый доход за цикл: ${expectedIncome} TON`);
    });
    
    if (tonBoosters.length > 5) {
      console.log(`   ... и еще ${tonBoosters.length - 5} пользователей с TON Boost`);
    }
  }
  
  // 7. ИТОГОВЫЙ АНАЛИЗ
  console.log('\n📋 7. ИТОГОВЫЙ АНАЛИЗ НАЧИСЛЕНИЙ:');
  console.log('-'.repeat(50));
  
  const currentTime = new Date();
  console.log(`🕐 Время проверки: ${currentTime.toLocaleString('ru-RU')}`);
  
  // Последние транзакции по времени
  const { data: latestTx, error: latestError } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (!latestError && latestTx?.length > 0) {
    console.log('\n🔥 Последние транзакции в системе:');
    latestTx.forEach((tx, idx) => {
      const amount = tx.amount_uni || tx.amount_ton || '0';
      const currency = tx.amount_uni ? 'UNI' : 'TON';
      const dateStr = new Date(tx.created_at).toLocaleString('ru-RU');
      const timeDiff = Math.round((currentTime - new Date(tx.created_at)) / 1000 / 60);
      console.log(`   ${idx + 1}. [${timeDiff} мин назад] ID: ${tx.id} | User: ${tx.user_id} | +${amount} ${currency} | ${tx.description.substring(0, 50)}...`);
    });
  }
  
  console.log('\n📊 РЕКОМЕНДАЦИИ:');
  if (recentTransactions?.length > 0) {
    console.log('✅ Основной пользователь получает начисления');
  } else {
    console.log('⚠️ Основной пользователь не получает начисления - проверить планировщики');
  }
  
  if (referralTx?.length > 0) {
    console.log('✅ Реферальная система работает');
  } else {
    console.log('⚠️ Реферальные начисления не работают - проверить логику комиссий');
  }
  
  if (uniFarmers?.length > 0) {
    console.log(`✅ ${uniFarmers.length} UNI фармеров готовы к начислениям`);
  }
  
  if (tonBoosters?.length > 0) {
    console.log(`✅ ${tonBoosters.length} TON Boost пользователей готовы к начислениям`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 ИССЛЕДОВАНИЕ ЗАВЕРШЕНО');
}

investigateAccruals().catch(console.error);