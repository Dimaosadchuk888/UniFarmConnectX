/**
 * МОНИТОРИНГ ПОПОЛНЕНИЯ USER 25 В РЕАЛЬНОМ ВРЕМЕНИ
 * Отслеживаем куда пойдет депозит и что с ним произойдет
 */

import { supabase } from './core/supabase.js';

let monitoringActive = true;
let lastTransactionId = 0;
let lastBalanceCheck = { uni: 0, ton: 0 };

async function monitorDeposit() {
  console.log('🔍 МОНИТОРИНГ ДЕПОЗИТА USER 25 - ЗАПУЩЕН');
  console.log('⏰ Начало мониторинга:', new Date().toISOString());

  // Получаем начальное состояние
  console.log('\n=== НАЧАЛЬНОЕ СОСТОЯНИЕ ===');
  
  // Проверяем оба возможных профиля User 25
  const { data: profiles } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_uni, balance_ton, updated_at')
    .or('telegram_id.eq.25,id.eq.25');

  console.log('👥 Найдено профилей User 25:', profiles?.length || 0);
  
  if (profiles) {
    profiles.forEach((profile, i) => {
      console.log(`  Профиль ${i+1}:`);
      console.log(`    internal_id: ${profile.id}`);
      console.log(`    telegram_id: ${profile.telegram_id}`);
      console.log(`    username: ${profile.username}`);
      console.log(`    balance_uni: ${profile.balance_uni}`);
      console.log(`    balance_ton: ${profile.balance_ton}`);
      console.log(`    updated_at: ${profile.updated_at}`);
      console.log('    ---');
      
      // Запоминаем начальные балансы
      if (profile.telegram_id === 25) {
        lastBalanceCheck.uni = parseFloat(profile.balance_uni) || 0;
        lastBalanceCheck.ton = parseFloat(profile.balance_ton) || 0;
        console.log(`📊 Начальный баланс основного профиля: ${lastBalanceCheck.uni} UNI, ${lastBalanceCheck.ton} TON`);
      }
    });
  }

  // Получаем последний ID транзакции
  const { data: lastTx } = await supabase
    .from('transactions')
    .select('id')
    .order('id', { ascending: false })
    .limit(1);
  
  if (lastTx && lastTx[0]) {
    lastTransactionId = lastTx[0].id;
    console.log(`📝 Последняя транзакция в системе: ID ${lastTransactionId}`);
  }

  console.log('\n🚀 ГОТОВ К МОНИТОРИНГУ! Делайте пополнение...\n');

  // Начинаем мониторинг
  const monitorInterval = setInterval(async () => {
    try {
      await checkForChanges();
    } catch (error) {
      console.error('❌ Ошибка мониторинга:', error.message);
    }
  }, 2000); // Проверяем каждые 2 секунды

  // Останавливаем через 10 минут
  setTimeout(() => {
    monitoringActive = false;
    clearInterval(monitorInterval);
    console.log('\n⏰ МОНИТОРИНГ ЗАВЕРШЕН (10 минут)');
  }, 10 * 60 * 1000);
}

async function checkForChanges() {
  if (!monitoringActive) return;

  const now = new Date().toISOString();
  
  // 1. Проверяем новые транзакции
  const { data: newTransactions } = await supabase
    .from('transactions')
    .select('*')
    .gt('id', lastTransactionId)
    .order('id', { ascending: true });

  if (newTransactions && newTransactions.length > 0) {
    console.log(`\n🆕 НОВЫЕ ТРАНЗАКЦИИ ОБНАРУЖЕНЫ: ${newTransactions.length}`);
    
    newTransactions.forEach((tx) => {
      console.log(`  ⚡ ID ${tx.id}: User ${tx.user_id} | ${tx.type}`);
      console.log(`     Сумма: ${tx.amount_uni || tx.amount_ton} ${tx.currency}`);
      console.log(`     Статус: ${tx.status}`);
      console.log(`     Описание: ${tx.description}`);
      console.log(`     Время: ${tx.created_at}`);
      console.log(`     Hash: ${tx.tx_hash || 'нет'}`);
      
      // Особое внимание к User 25
      if (tx.user_id === 25) {
        console.log(`     🎯 ЭТО ТРАНЗАКЦИЯ USER 25!`);
        console.log(`     🔍 Тип: ${tx.type}`);
        console.log(`     💰 Сумма: ${tx.amount_uni || tx.amount_ton} ${tx.currency}`);
      }
      
      // Особое внимание к User 227 (дубликат)
      if (tx.user_id === 227) {
        console.log(`     ⚠️ ЭТО ТРАНЗАКЦИЯ ДУБЛИКАТА USER 227!`);
        console.log(`     🔍 Тип: ${tx.type}`);
        console.log(`     💰 Сумма: ${tx.amount_uni || tx.amount_ton} ${tx.currency}`);
      }
      
      console.log('     ---');
      
      lastTransactionId = Math.max(lastTransactionId, tx.id);
    });
  }

  // 2. Проверяем изменения балансов
  const { data: currentProfiles } = await supabase
    .from('users')
    .select('id, telegram_id, balance_uni, balance_ton, updated_at')
    .or('telegram_id.eq.25,id.eq.25');

  if (currentProfiles) {
    currentProfiles.forEach((profile) => {
      const currentUni = parseFloat(profile.balance_uni) || 0;
      const currentTon = parseFloat(profile.balance_ton) || 0;
      
      if (profile.telegram_id === 25) {
        const uniDiff = currentUni - lastBalanceCheck.uni;
        const tonDiff = currentTon - lastBalanceCheck.ton;
        
        if (Math.abs(uniDiff) > 0.001 || Math.abs(tonDiff) > 0.001) {
          console.log(`\n📊 ИЗМЕНЕНИЕ БАЛАНСА ОСНОВНОГО ПРОФИЛЯ (telegram_id=25):`);
          console.log(`   UNI: ${lastBalanceCheck.uni} → ${currentUni} (${uniDiff > 0 ? '+' : ''}${uniDiff.toFixed(6)})`);
          console.log(`   TON: ${lastBalanceCheck.ton} → ${currentTon} (${tonDiff > 0 ? '+' : ''}${tonDiff.toFixed(6)})`);
          console.log(`   Время обновления: ${profile.updated_at}`);
          
          lastBalanceCheck.uni = currentUni;
          lastBalanceCheck.ton = currentTon;
        }
      }
      
      if (profile.id === 25 && profile.telegram_id !== 25) {
        console.log(`\n⚠️ БАЛАНС ДУБЛИКАТА (internal_id=25, telegram_id=${profile.telegram_id}):`);
        console.log(`   UNI: ${profile.balance_uni}`);
        console.log(`   TON: ${profile.balance_ton}`);
        console.log(`   Обновлен: ${profile.updated_at}`);
      }
    });
  }
}

monitorDeposit();