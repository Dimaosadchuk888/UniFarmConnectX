/**
 * ФИНАЛЬНЫЙ ОТЧЕТ ПО 20-УРОВНЕВОЙ РЕФЕРАЛЬНОЙ СИСТЕМЕ
 * Полный анализ созданной структуры для user_id=48
 */

import { createClient } from '@supabase/supabase-js';

async function generateFinalReferralReport() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🎯 ФИНАЛЬНЫЙ ОТЧЕТ ПО 20-УРОВНЕВОЙ РЕФЕРАЛЬНОЙ СИСТЕМЕ');
  console.log('='.repeat(70));
  
  const baseUserId = 48;
  
  // 1. АНАЛИЗ ОСНОВНОГО ПОЛЬЗОВАТЕЛЯ
  console.log('\n📊 1. ОСНОВНОЙ ПОЛЬЗОВАТЕЛЬ:');
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
  
  console.log(`✅ Основной пользователь: ${mainUser.username} (ID: ${baseUserId})`);
  console.log(`🔗 Реферальный код: ${mainUser.ref_code}`);
  console.log(`💰 Балансы: ${mainUser.balance_uni} UNI, ${mainUser.balance_ton} TON`);
  console.log(`📈 UNI фарминг: ${mainUser.uni_farming_active ? 'Активен' : 'Неактивен'} (депозит: ${mainUser.uni_deposit_amount} UNI)`);
  console.log(`🚀 TON Boost: Пакет ${mainUser.ton_boost_package} (ставка: ${(mainUser.ton_boost_rate * 100).toFixed(1)}%)`);
  
  // 2. АНАЛИЗ ПАРТНЕРСКОЙ СТРУКТУРЫ
  console.log('\n📊 2. ПАРТНЕРСКАЯ СТРУКТУРА:');
  console.log('-'.repeat(50));
  
  const { data: allPartners, error: partnersError } = await supabase
    .from('users')
    .select('id, username, telegram_id, referred_by, balance_uni, balance_ton, ref_code, uni_farming_active, ton_boost_package')
    .gte('telegram_id', 999999000)
    .order('id');
  
  if (partnersError) {
    console.log('❌ Ошибка получения партнеров:', partnersError.message);
    return;
  }
  
  console.log(`✅ Найдено партнеров: ${allPartners.length}`);
  
  // Построение реферальной цепочки
  console.log('\n🔗 РЕФЕРАЛЬНАЯ ЦЕПОЧКА:');
  console.log('-'.repeat(50));
  
  let chainStructure = [];
  let currentReferrer = baseUserId;
  let level = 0;
  
  // Основной пользователь
  chainStructure.push({
    level: 0,
    user_id: baseUserId,
    username: mainUser.username,
    telegram_id: mainUser.telegram_id,
    ref_code: mainUser.ref_code,
    balance_uni: mainUser.balance_uni,
    balance_ton: mainUser.balance_ton,
    referrer_id: null
  });
  
  // Строим цепочку по referred_by
  while (currentReferrer && level < 20) {
    const nextPartner = allPartners.find(p => p.referred_by === currentReferrer);
    
    if (nextPartner) {
      level++;
      chainStructure.push({
        level: level,
        user_id: nextPartner.id,
        username: nextPartner.username,
        telegram_id: nextPartner.telegram_id,
        ref_code: nextPartner.ref_code,
        balance_uni: nextPartner.balance_uni,
        balance_ton: nextPartner.balance_ton,
        referrer_id: currentReferrer
      });
      currentReferrer = nextPartner.id;
    } else {
      break;
    }
  }
  
  console.log('Уровень | User ID | Username         | Telegram ID  | Ref Code                      | Балансы (UNI/TON)');
  console.log('-'.repeat(110));
  
  chainStructure.forEach(user => {
    const levelStr = user.level === 0 ? 'MAIN' : user.level.toString().padStart(2);
    console.log(`   ${levelStr}    | ${user.user_id.toString().padStart(7)} | ${user.username.padEnd(16)} | ${user.telegram_id} | ${user.ref_code.padEnd(29)} | ${user.balance_uni}/${user.balance_ton}`);
  });
  
  console.log(`\n📈 Длина цепочки: ${level} уровней`);
  console.log(`🎯 Целевая глубина: 20 уровней`);
  console.log(`📊 Процент завершения: ${((level / 20) * 100).toFixed(1)}%`);
  
  // 3. АНАЛИЗ ПРЯМЫХ РЕФЕРАЛОВ
  console.log('\n📊 3. ПРЯМЫЕ РЕФЕРАЛЫ USER_ID=48:');
  console.log('-'.repeat(50));
  
  const directReferrals = allPartners.filter(p => p.referred_by === baseUserId);
  console.log(`✅ Количество прямых рефералов: ${directReferrals.length}`);
  
  if (directReferrals.length > 0) {
    directReferrals.forEach((referral, idx) => {
      console.log(`   ${idx + 1}. ID: ${referral.id} | ${referral.username} | Балансы: ${referral.balance_uni} UNI, ${referral.balance_ton} TON`);
    });
  }
  
  // 4. АНАЛИЗ ТРАНЗАКЦИЙ И НАЧИСЛЕНИЙ
  console.log('\n📊 4. РЕФЕРАЛЬНЫЕ НАЧИСЛЕНИЯ:');
  console.log('-'.repeat(50));
  
  const { data: referralTransactions, error: refTxError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', baseUserId)
    .ilike('description', '%referral%')
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (!refTxError && referralTransactions?.length > 0) {
    console.log(`✅ Найдено реферальных начислений: ${referralTransactions.length}`);
    
    referralTransactions.forEach((tx, idx) => {
      const amount = tx.amount_uni || tx.amount_ton || '0';
      const currency = tx.amount_uni ? 'UNI' : 'TON';
      console.log(`   ${idx + 1}. ID: ${tx.id} | +${amount} ${currency} | ${tx.description}`);
    });
    
    const totalReferralUni = referralTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount_uni || 0), 0);
    const totalReferralTon = referralTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount_ton || 0), 0);
    
    console.log(`\n💰 Общий доход от рефералов: ${totalReferralUni.toFixed(4)} UNI + ${totalReferralTon.toFixed(4)} TON`);
  } else {
    console.log('📝 Реферальные начисления пока не найдены');
  }
  
  // 5. АНАЛИЗ АКТИВНОСТИ ПАРТНЕРОВ
  console.log('\n📊 5. АКТИВНОСТЬ ПАРТНЕРОВ:');
  console.log('-'.repeat(50));
  
  const { data: partnerTransactions, error: partnerTxError } = await supabase
    .from('transactions')
    .select('user_id, type, amount_uni, amount_ton, description, created_at')
    .in('user_id', allPartners.map(p => p.id))
    .order('created_at', { ascending: false })
    .limit(30);
  
  if (!partnerTxError && partnerTransactions?.length > 0) {
    console.log(`✅ Активность партнеров (последние 30 транзакций):`);
    
    // Группируем по пользователям
    const activityByUser = {};
    partnerTransactions.forEach(tx => {
      if (!activityByUser[tx.user_id]) {
        activityByUser[tx.user_id] = [];
      }
      activityByUser[tx.user_id].push(tx);
    });
    
    Object.keys(activityByUser).forEach(userId => {
      const partner = allPartners.find(p => p.id == userId);
      const transactions = activityByUser[userId];
      const uniTotal = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount_uni || 0), 0);
      const tonTotal = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount_ton || 0), 0);
      
      if (partner) {
        console.log(`   ${partner.username} (ID: ${userId}): ${transactions.length} транзакций | Сумма: ${uniTotal.toFixed(2)} UNI + ${tonTotal.toFixed(2)} TON`);
      }
    });
    
    const activePartners = Object.keys(activityByUser).length;
    console.log(`\n📈 Активных партнеров: ${activePartners}/${allPartners.length}`);
  } else {
    console.log('📝 Активность партнеров пока не зафиксирована');
  }
  
  // 6. ОБЩАЯ СТАТИСТИКА СЕТИ
  console.log('\n📊 6. ОБЩАЯ СТАТИСТИКА СЕТИ:');
  console.log('-'.repeat(50));
  
  const allUsers = [mainUser, ...allPartners];
  const totalUsers = allUsers.length;
  const totalUniBalance = allUsers.reduce((sum, u) => sum + parseFloat(u.balance_uni || 0), 0);
  const totalTonBalance = allUsers.reduce((sum, u) => sum + parseFloat(u.balance_ton || 0), 0);
  const activeUniUsers = allUsers.filter(u => u.uni_farming_active === true).length;
  const tonBoostUsers = allUsers.filter(u => u.ton_boost_package && u.ton_boost_package > 0).length;
  
  console.log(`📊 Общее количество пользователей: ${totalUsers}`);
  console.log(`💰 Общий UNI баланс сети: ${totalUniBalance.toFixed(2)} UNI`);
  console.log(`💰 Общий TON баланс сети: ${totalTonBalance.toFixed(2)} TON`);
  console.log(`📈 Активных UNI фармеров: ${activeUniUsers}`);
  console.log(`🚀 Пользователей с TON Boost: ${tonBoostUsers}`);
  console.log(`🔗 Глубина реферальной сети: ${level} уровней`);
  
  // 7. ПРОВЕРКА ИНТЕРФЕЙСА
  console.log('\n📊 7. ГОТОВНОСТЬ К ДЕМОНСТРАЦИИ:');
  console.log('-'.repeat(50));
  
  const readinessChecks = [
    { check: 'Основной пользователь настроен', status: mainUser ? '✅' : '❌' },
    { check: 'Реферальная структура создана', status: level >= 10 ? '✅' : '🟡' },
    { check: 'Партнеры имеют балансы', status: allPartners.every(p => p.balance_uni > 0) ? '✅' : '❌' },
    { check: 'Реферальные начисления созданы', status: referralTransactions?.length > 0 ? '✅' : '📝' },
    { check: 'Транзакционная активность', status: partnerTransactions?.length > 0 ? '✅' : '📝' },
    { check: 'Цепочка до 20 уровня', status: level === 20 ? '✅' : '🔄' }
  ];
  
  readinessChecks.forEach(item => {
    console.log(`   ${item.status} ${item.check}`);
  });
  
  const readyCount = readinessChecks.filter(item => item.status === '✅').length;
  const readinessPercent = (readyCount / readinessChecks.length) * 100;
  
  console.log(`\n📈 Готовность к демонстрации: ${readinessPercent.toFixed(1)}%`);
  
  // 8. ИТОГОВЫЕ РЕКОМЕНДАЦИИ
  console.log('\n📊 8. ИТОГОВЫЕ РЕКОМЕНДАЦИИ:');
  console.log('-'.repeat(50));
  
  if (level === 20) {
    console.log('✅ 20-уровневая структура полностью создана');
    console.log('✅ Система готова к полному тестированию');
    console.log('📱 Рекомендуется проверить отображение в интерфейсе');
  } else if (level >= 10) {
    console.log(`🟡 Создано ${level} уровней из 20 (частично готово)`);
    console.log('📝 Рекомендуется завершить создание оставшихся уровней');
    console.log('✅ Базовая функциональность может быть протестирована');
  } else {
    console.log(`❌ Создано только ${level} уровней (требуется доработка)`);
    console.log('🔄 Необходимо продолжить создание структуры');
  }
  
  console.log('\n📋 ССЫЛКИ ДЛЯ ТЕСТИРОВАНИЯ:');
  console.log(`🔗 Реферальная ссылка: https://t.me/UniFarming_Bot/UniFarm?startapp=${mainUser.ref_code}`);
  console.log(`📱 Интерфейс: https://uni-farm-connect-x-osadchukdmitro2.replit.app`);
  console.log(`👤 Основной кабинет: user_id=${baseUserId}`);
  
  console.log('\n' + '='.repeat(70));
  console.log('🎯 ОТЧЕТ ПО РЕФЕРАЛЬНОЙ СИСТЕМЕ ЗАВЕРШЕН');
  
  return {
    main_user: mainUser,
    partners_count: allPartners.length,
    chain_length: level,
    readiness_percent: readinessPercent,
    total_network_uni: totalUniBalance,
    total_network_ton: totalTonBalance,
    referral_rewards: referralTransactions?.length || 0
  };
}

generateFinalReferralReport().catch(console.error);