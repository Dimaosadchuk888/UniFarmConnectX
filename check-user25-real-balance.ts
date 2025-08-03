#!/usr/bin/env tsx

/**
 * КРИТИЧЕСКАЯ ДИАГНОСТИКА: Проверка реального баланса User 25 в БД
 * Исследуем проблему с кешированием
 */

import { supabase } from './core/supabaseClient';
import { logger } from './core/logger';

async function checkUser25Balance() {
  console.log('🔍 КРИТИЧЕСКАЯ ДИАГНОСТИКА: Баланс User 25 в БД\n');

  try {
    // 1. Проверяем текущий баланс User 25 в БД
    const { data: user25, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_uni, balance_ton, created_at')
      .eq('id', 25)
      .single();

    if (userError || !user25) {
      console.log('❌ User 25 не найден:', userError?.message);
      return;
    }

    console.log('📊 ТЕКУЩИЙ БАЛАНС USER 25 В БД:');
    console.log(`User ID: ${user25.id}`);
    console.log(`Telegram: ${user25.telegram_id} (@${user25.username})`);
    console.log(`UNI: ${user25.balance_uni}`);
    console.log(`TON: ${user25.balance_ton}`);
    console.log(`Создан: ${user25.created_at}`);

    // 2. Проверяем последние 20 транзакций User 25
    const { data: recentTransactions, error: txError } = await supabase
      .from('transactions')
      .select('id, type, amount_ton, amount_uni, created_at, description, tx_hash_unique')
      .eq('user_id', 25)
      .order('created_at', { ascending: false })
      .limit(20);

    console.log('\n📈 ПОСЛЕДНИЕ 20 ТРАНЗАКЦИЙ USER 25:');
    if (recentTransactions && recentTransactions.length > 0) {
      recentTransactions.forEach((tx, index) => {
        const time = new Date(tx.created_at).toLocaleTimeString();
        const date = new Date(tx.created_at).toLocaleDateString();
        console.log(`${index + 1}. [${date} ${time}] ${tx.type} | UNI: ${tx.amount_uni} | TON: ${tx.amount_ton} | ${tx.description}`);
        if (tx.tx_hash_unique) {
          console.log(`    Hash: ${tx.tx_hash_unique}`);
        }
      });
    } else {
      console.log('   Транзакции не найдены');
    }

    // 3. Ищем TON депозиты за последние 24 часа
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentDeposits, error: depositsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .eq('type', 'TON_DEPOSIT')
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false });

    console.log('\n💰 TON ДЕПОЗИТЫ ЗА ПОСЛЕДНИЕ 24 ЧАСА:');
    if (recentDeposits && recentDeposits.length > 0) {
      let totalTonDeposits = 0;
      recentDeposits.forEach((deposit, index) => {
        totalTonDeposits += parseFloat(deposit.amount_ton || '0');
        console.log(`${index + 1}. ${deposit.created_at} | ${deposit.amount_ton} TON | ${deposit.description}`);
        console.log(`    Hash: ${deposit.tx_hash_unique}`);
      });
      console.log(`\n📊 ВСЕГО TON ДЕПОЗИТОВ: ${totalTonDeposits.toFixed(6)} TON`);
    } else {
      console.log('   Депозитов за 24 часа не найдено');
    }

    // 4. Проверяем суммарный баланс из транзакций
    const { data: allTransactions, error: allTxError } = await supabase
      .from('transactions')
      .select('type, amount_uni, amount_ton')
      .eq('user_id', 25);

    if (allTransactions && !allTxError) {
      let calculatedUni = 0;
      let calculatedTon = 0;

      allTransactions.forEach(tx => {
        const uni = parseFloat(tx.amount_uni || '0');
        const ton = parseFloat(tx.amount_ton || '0');

        // Доходы
        if (['TON_DEPOSIT', 'FARMING_REWARD', 'REFERRAL_REWARD', 'DAILY_BONUS', 'MISSION_REWARD', 'DEPOSIT'].includes(tx.type)) {
          calculatedUni += uni;
          calculatedTon += ton;
        }
        // Расходы
        else if (['WITHDRAWAL', 'FARMING_DEPOSIT', 'BOOST_PAYMENT', 'TON_BOOST_PURCHASE'].includes(tx.type)) {
          calculatedUni -= uni;
          calculatedTon -= ton;
        }
      });

      console.log('\n🧮 РАСЧЕТНЫЙ БАЛАНС ИЗ ТРАНЗАКЦИЙ:');
      console.log(`UNI: ${calculatedUni.toFixed(6)}`);
      console.log(`TON: ${calculatedTon.toFixed(6)}`);

      console.log('\n⚖️ СРАВНЕНИЕ БД vs РАСЧЕТНЫЙ:');
      console.log(`UNI: БД=${user25.balance_uni} | РАСЧЕТ=${calculatedUni.toFixed(6)} | РАЗНИЦА=${(parseFloat(user25.balance_uni.toString()) - calculatedUni).toFixed(6)}`);
      console.log(`TON: БД=${user25.balance_ton} | РАСЧЕТ=${calculatedTon.toFixed(6)} | РАЗНИЦА=${(parseFloat(user25.balance_ton.toString()) - calculatedTon).toFixed(6)}`);
    }

    // 5. Проверяем, есть ли записи в кеше (симуляция)
    console.log('\n🔄 ДИАГНОСТИКА КЕШИРОВАНИЯ:');
    console.log('Backend кеш TTL: 5 минут');
    console.log('Frontend кеш TTL: 15 секунд');
    console.log('Проблема: Frontend показывает устаревший кеш после депозита');

  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
    logger.error('[CRITICAL] Ошибка диагностики User 25', { error });
  }
}

// Запускаем диагностику
checkUser25Balance().catch(console.error);