/**
 * ЭКСТРЕННАЯ ПРОВЕРКА ПРОПАВШЕГО ДЕПОЗИТА USER 25
 * Проверяем что произошло с депозитом 1 TON прямо сейчас
 */

import { supabase } from './core/supabase.js';

async function checkMissingDeposit() {
  console.log('🚨 ЭКСТРЕННАЯ ПРОВЕРКА ПРОПАВШЕГО ДЕПОЗИТА');
  console.log('⏰ Время:', new Date().toISOString());
  
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  
  // 1. Ищем все депозиты за последние 5 минут
  console.log('\n=== ПОИСК ДЕПОЗИТОВ ЗА 5 МИНУТ ===');
  
  const { data: recentDeposits } = await supabase
    .from('transactions')
    .select('*')
    .in('type', ['TON_DEPOSIT', 'FARMING_DEPOSIT'])
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false });
  
  console.log(`💎 Депозиты за 5 минут: ${recentDeposits?.length || 0}`);
  
  if (recentDeposits && recentDeposits.length > 0) {
    recentDeposits.forEach((dep, i) => {
      console.log(`  ${i+1}. User ${dep.user_id}: ${dep.type}`);
      console.log(`     Сумма: ${dep.amount_uni || dep.amount_ton} ${dep.currency}`);
      console.log(`     Статус: ${dep.status}`);
      console.log(`     Время: ${dep.created_at}`);
      console.log(`     Hash: ${dep.tx_hash || 'нет'}`);
      
      if (dep.user_id === 25) {
        console.log(`     🎯 ЭТО ДЕПОЗИТ USER 25! Найден!`);
      }
      if (dep.user_id === 227) {
        console.log(`     ⚠️ ЭТО ДЕПОЗИТ ДУБЛИКАТА USER 227!`);
      }
      console.log('     ---');
    });
  } else {
    console.log('  ❌ Депозитов не найдено');
  }
  
  // 2. Ищем все транзакции User 25 за 5 минут
  console.log('\n=== ТРАНЗАКЦИИ USER 25 ЗА 5 МИНУТ ===');
  
  const { data: user25Transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 25)
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false });
  
  console.log(`📋 Транзакции User 25: ${user25Transactions?.length || 0}`);
  
  if (user25Transactions && user25Transactions.length > 0) {
    user25Transactions.forEach((tx, i) => {
      console.log(`  ${i+1}. ${tx.type} | ${tx.amount_uni || tx.amount_ton} ${tx.currency} | ${tx.status}`);
      console.log(`     Время: ${tx.created_at}`);
      console.log(`     Описание: ${tx.description}`);
    });
  }
  
  // 3. Ищем транзакции дубликата User 227 за 5 минут
  console.log('\n=== ТРАНЗАКЦИИ ДУБЛИКАТА USER 227 ЗА 5 МИНУТ ===');
  
  const { data: user227Transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 227)
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false });
  
  console.log(`📋 Транзакции User 227: ${user227Transactions?.length || 0}`);
  
  if (user227Transactions && user227Transactions.length > 0) {
    user227Transactions.forEach((tx, i) => {
      console.log(`  ${i+1}. ${tx.type} | ${tx.amount_uni || tx.amount_ton} ${tx.currency} | ${tx.status}`);
      console.log(`     Время: ${tx.created_at}`);
      console.log(`     Описание: ${tx.description}`);
    });
  }
  
  // 4. Проверяем балансы обоих профилей
  console.log('\n=== ТЕКУЩИЕ БАЛАНСЫ ===');
  
  const { data: profiles } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_uni, balance_ton, updated_at')
    .or('telegram_id.eq.25,id.eq.25,id.eq.227');
  
  if (profiles) {
    profiles.forEach((profile) => {
      console.log(`👤 Профиль:`);
      console.log(`   internal_id: ${profile.id}`);
      console.log(`   telegram_id: ${profile.telegram_id}`);
      console.log(`   username: ${profile.username}`);
      console.log(`   UNI: ${profile.balance_uni}`);
      console.log(`   TON: ${profile.balance_ton}`);
      console.log(`   Обновлен: ${profile.updated_at}`);
      console.log('   ---');
    });
  }
  
  // 5. Ищем pending или processing транзакции
  console.log('\n=== НЕЗАВЕРШЕННЫЕ ТРАНЗАКЦИИ ===');
  
  const { data: pendingTx } = await supabase
    .from('transactions')
    .select('*')
    .in('status', ['pending', 'processing'])
    .or('user_id.eq.25,user_id.eq.227')
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false });
  
  console.log(`⏳ Pending транзакций: ${pendingTx?.length || 0}`);
  
  if (pendingTx && pendingTx.length > 0) {
    pendingTx.forEach((tx, i) => {
      console.log(`  ${i+1}. User ${tx.user_id}: ${tx.type} | ${tx.status}`);
      console.log(`     Сумма: ${tx.amount_uni || tx.amount_ton} ${tx.currency}`);
      console.log(`     Время: ${tx.created_at}`);
      console.log(`     Hash: ${tx.tx_hash || 'нет'}`);
    });
  }
  
  // ВЫВОДЫ
  console.log('\n=== 🎯 ДИАГНОЗ ===');
  
  const totalDeposits = recentDeposits?.length || 0;
  const user25Deposits = recentDeposits?.filter(d => d.user_id === 25).length || 0;
  const user227Deposits = recentDeposits?.filter(d => d.user_id === 227).length || 0;
  
  console.log(`📊 СТАТИСТИКА:`);
  console.log(`   Всего депозитов за 5 мин: ${totalDeposits}`);
  console.log(`   Депозиты User 25: ${user25Deposits}`);
  console.log(`   Депозиты User 227: ${user227Deposits}`);
  console.log(`   Транзакции User 25: ${user25Transactions?.length || 0}`);
  console.log(`   Транзакции User 227: ${user227Transactions?.length || 0}`);
  
  if (totalDeposits === 0) {
    console.log('\n❌ ПРОБЛЕМА: Депозит не создается в транзакциях!');
    console.log('   - Возможно проблема в API endpoint обработки депозитов');
    console.log('   - Или проблема в middleware создания транзакций');
  } else if (user25Deposits === 0 && user227Deposits === 0) {
    console.log('\n❌ ПРОБЛЕМА: Депозиты создаются, но не для User 25/227!');
    console.log('   - Возможно проблема в определении user_id при создании');
  } else if (user25Deposits > 0 || user227Deposits > 0) {
    console.log('\n✅ Депозит найден! Проблема может быть в обновлении баланса');
  }
}

checkMissingDeposit();