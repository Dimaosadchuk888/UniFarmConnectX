/**
 * Проверка созданной структуры партнеров
 */

import { createClient } from '@supabase/supabase-js';

async function checkCurrentStructure() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('📊 ПРОВЕРКА СОЗДАННОЙ РЕФЕРАЛЬНОЙ СТРУКТУРЫ');
  console.log('='.repeat(60));
  
  // Проверяем созданных партнеров
  const { data: partners, error: partnersError } = await supabase
    .from('users')
    .select('id, username, telegram_id, referred_by, balance_uni, balance_ton, ref_code')
    .gte('telegram_id', 999999000)
    .order('id');
  
  if (partnersError) {
    console.log('❌ Ошибка получения партнеров:', partnersError.message);
    return;
  }
  
  console.log(`✅ Найдено партнеров: ${partners.length}`);
  console.log('\n📋 СТРУКТУРА ПАРТНЕРОВ:');
  console.log('-'.repeat(90));
  console.log('Уровень | User ID | Username         | Telegram ID  | Референт | Балансы (UNI/TON)');
  console.log('-'.repeat(90));
  
  partners.forEach((partner, idx) => {
    const level = partner.telegram_id - 999999000;
    console.log(`   ${level.toString().padStart(2)}     | ${partner.id.toString().padStart(7)} | ${partner.username.padEnd(16)} | ${partner.telegram_id} | ${partner.referred_by.toString().padStart(8)} | ${partner.balance_uni}/${partner.balance_ton}`);
  });
  
  // Проверяем основного пользователя
  const { data: mainUser, error: mainError } = await supabase
    .from('users')
    .select('id, username, balance_uni, balance_ton, ref_code')
    .eq('id', 48)
    .single();
  
  if (!mainError && mainUser) {
    console.log('\n📊 ОСНОВНОЙ ПОЛЬЗОВАТЕЛЬ (ID: 48):');
    console.log(`   Username: ${mainUser.username}`);
    console.log(`   Ref Code: ${mainUser.ref_code}`);
    console.log(`   Балансы: ${mainUser.balance_uni} UNI, ${mainUser.balance_ton} TON`);
    
    // Подсчитываем прямых рефералов
    const directReferrals = partners.filter(p => p.referred_by === 48).length;
    console.log(`   Прямых рефералов: ${directReferrals}`);
  }
  
  // Проверяем реферальную цепочку
  console.log('\n🔗 РЕФЕРАЛЬНАЯ ЦЕПОЧКА:');
  console.log('-'.repeat(60));
  
  let currentReferrer = 48;
  let chainLevel = 0;
  
  while (currentReferrer && chainLevel < 21) {
    const referrer = chainLevel === 0 ? mainUser : partners.find(p => p.id === currentReferrer);
    
    if (referrer) {
      if (chainLevel === 0) {
        console.log(`   Уровень ${chainLevel}: ID ${referrer.id} (${referrer.username}) - ОСНОВНОЙ`);
      } else {
        console.log(`   Уровень ${chainLevel}: ID ${referrer.id} (${referrer.username}) - Партнер`);
      }
      
      // Ищем следующего в цепочке
      const nextInChain = partners.find(p => p.referred_by === currentReferrer);
      currentReferrer = nextInChain ? nextInChain.id : null;
      chainLevel++;
    } else {
      break;
    }
  }
  
  console.log(`\n📈 Длина цепочки: ${chainLevel - 1} уровней (+ основной пользователь)`);
  
  // Проверяем транзакции
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('id, user_id, type, amount_uni, amount_ton, description')
    .in('user_id', [48, ...partners.map(p => p.id)])
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (!txError && transactions?.length > 0) {
    console.log('\n💰 ПОСЛЕДНИЕ ТРАНЗАКЦИИ:');
    console.log('-'.repeat(60));
    transactions.forEach((tx, idx) => {
      const amount = tx.amount_uni || tx.amount_ton || '0';
      const currency = tx.amount_uni ? 'UNI' : 'TON';
      const isMainUser = tx.user_id === 48;
      console.log(`   ${idx + 1}. ${isMainUser ? '[MAIN]' : '[PART]'} ID: ${tx.id} | User: ${tx.user_id} | ${amount} ${currency} | ${tx.description.substring(0, 50)}...`);
    });
  }
  
  // Анализ реферальных начислений
  const { data: referralTx, error: refError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 48)
    .ilike('description', '%referral%')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (!refError && referralTx?.length > 0) {
    console.log('\n👥 РЕФЕРАЛЬНЫЕ НАЧИСЛЕНИЯ ОСНОВНОГО ПОЛЬЗОВАТЕЛЯ:');
    console.log('-'.repeat(60));
    referralTx.forEach((tx, idx) => {
      const amount = tx.amount_uni || tx.amount_ton || '0';
      const currency = tx.amount_uni ? 'UNI' : 'TON';
      console.log(`   ${idx + 1}. ID: ${tx.id} | +${amount} ${currency} | ${tx.description}`);
    });
    
    const totalReferralIncome = referralTx.reduce((sum, tx) => sum + parseFloat(tx.amount_uni || 0), 0);
    console.log(`\n💰 Общий доход от рефералов: ${totalReferralIncome.toFixed(4)} UNI`);
  } else {
    console.log('\n📝 Реферальные начисления пока не найдены');
  }
  
  // Итоговая статистика
  console.log('\n📈 ИТОГОВАЯ СТАТИСТИКА:');
  console.log('='.repeat(60));
  
  const totalUsers = partners.length + 1; // +1 для основного
  const totalUniBalance = partners.reduce((sum, p) => sum + parseFloat(p.balance_uni || 0), 0) + parseFloat(mainUser?.balance_uni || 0);
  const totalTonBalance = partners.reduce((sum, p) => sum + parseFloat(p.balance_ton || 0), 0) + parseFloat(mainUser?.balance_ton || 0);
  const activePartners = partners.filter(p => parseFloat(p.balance_uni) > 100 || parseFloat(p.balance_ton) > 100).length;
  
  console.log(`📊 Общее количество пользователей: ${totalUsers}`);
  console.log(`💰 Общий UNI баланс сети: ${totalUniBalance.toFixed(2)} UNI`);
  console.log(`💰 Общий TON баланс сети: ${totalTonBalance.toFixed(2)} TON`);
  console.log(`🔗 Создано уровней: ${partners.length}/20`);
  console.log(`✅ Активных партнеров: ${activePartners}`);
  console.log(`📈 Процент завершения: ${((partners.length / 20) * 100).toFixed(1)}%`);
  
  if (partners.length < 20) {
    console.log('\n⚡ РЕКОМЕНДАЦИЯ: Запустите скрипт еще раз для создания оставшихся уровней');
  } else {
    console.log('\n✅ 20-УРОВНЕВАЯ СТРУКТУРА ПОЛНОСТЬЮ СОЗДАНА');
  }
}

checkCurrentStructure().catch(console.error);