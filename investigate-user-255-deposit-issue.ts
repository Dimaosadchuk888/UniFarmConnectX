#!/usr/bin/env tsx
/**
 * 🕵️ ДЕТЕКТИВНОЕ РАССЛЕДОВАНИЕ: Потерянные депозиты пользователя ID 255
 * 
 * Проблема: Пользователь ID 255 сделал пополнение на 1.65 TON (0.65 + 1.0),
 * деньги списались с его кошелька и поступили на админ кошелек,
 * но баланс в приложении не обновился.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function investigateUser255DepositIssue() {
  console.log('🕵️ НАЧИНАЕМ РАССЛЕДОВАНИЕ: Потерянные депозиты пользователя ID 255');
  console.log('='.repeat(80));

  try {
    // 1. Анализ пользователя ID 255
    console.log('\n📋 1. ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ ID 255:');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', 255)
      .single();

    if (userError) {
      console.log('❌ Ошибка получения пользователя:', userError);
    } else if (user) {
      console.log('✅ Пользователь найден:', {
        user_id: user.user_id,
        telegram_id: user.telegram_id,
        username: user.username,
        balance_ton: user.balance_ton,
        balance_uni: user.balance_uni,
        created_at: user.created_at,
        last_activity: user.last_activity
      });
    } else {
      console.log('❌ Пользователь ID 255 не найден в базе данных!');
      return;
    }

    // 2. Анализ всех транзакций пользователя ID 255
    console.log('\n💰 2. ВСЕ ТРАНЗАКЦИИ ПОЛЬЗОВАТЕЛЯ ID 255:');
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 255)
      .order('created_at', { ascending: false });

    if (txError) {
      console.log('❌ Ошибка получения транзакций:', txError);
    } else {
      console.log(`✅ Найдено транзакций: ${transactions?.length || 0}`);
      transactions?.forEach((tx, index) => {
        console.log(`\n📄 Транзакция ${index + 1}:`, {
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          currency: tx.currency,
          status: tx.status,
          description: tx.description,
          created_at: tx.created_at,
          tx_hash: tx.tx_hash || 'НЕТ ХЕША'
        });
      });
    }

    // 3. Поиск TON депозитов за последние 24 часа
    console.log('\n🔍 3. ПОИСК TON ДЕПОЗИТОВ ЗА ПОСЛЕДНИЕ 24 ЧАСА:');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: recentDeposits, error: depositsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .eq('currency', 'TON')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    if (depositsError) {
      console.log('❌ Ошибка получения депозитов:', depositsError);
    } else {
      console.log(`✅ Найдено TON депозитов за 24ч: ${recentDeposits?.length || 0}`);
      recentDeposits?.forEach((deposit, index) => {
        console.log(`\n💎 Депозит ${index + 1}:`, {
          user_id: deposit.user_id,
          amount: deposit.amount,
          status: deposit.status,
          tx_hash: deposit.tx_hash || 'НЕТ ХЕША',
          created_at: deposit.created_at,
          description: deposit.description
        });
      });
    }

    // 4. Поиск транзакций с суммами 0.65 и 1.0 TON
    console.log('\n🎯 4. ПОИСК ТРАНЗАКЦИЙ С СУММАМИ 0.65 И 1.0 TON:');
    const { data: suspiciousAmounts, error: amountsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('currency', 'TON')
      .in('amount', ['0.65', '1.0', '1', '0.650000'])
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    if (amountsError) {
      console.log('❌ Ошибка поиска по суммам:', amountsError);
    } else {
      console.log(`✅ Найдено транзакций с нужными суммами: ${suspiciousAmounts?.length || 0}`);
      suspiciousAmounts?.forEach((tx, index) => {
        console.log(`\n🔍 Подозрительная транзакция ${index + 1}:`, {
          user_id: tx.user_id,
          amount: tx.amount,
          type: tx.type,
          status: tx.status,
          tx_hash: tx.tx_hash || 'НЕТ ХЕША',
          created_at: tx.created_at,
          description: tx.description
        });
      });
    }

    // 5. Анализ дублирования транзакций
    console.log('\n🔄 5. АНАЛИЗ ДУБЛИРОВАНИЯ ТРАНЗАКЦИЙ:');
    const { data: duplicates, error: dupError } = await supabase
      .from('transactions')
      .select('tx_hash, count(*)')
      .not('tx_hash', 'is', null)
      .gt('count', 1)
      .group('tx_hash');

    if (dupError) {
      console.log('❌ Ошибка анализа дублирования:', dupError);
    } else {
      console.log(`✅ Найдено дублированных хешей: ${duplicates?.length || 0}`);
      duplicates?.forEach((dup, index) => {
        console.log(`\n⚠️ Дублированный хеш ${index + 1}:`, dup);
      });
    }

    // 6. Проверка баланса пользователя сейчас vs ожидаемого
    console.log('\n⚖️ 6. АНАЛИЗ БАЛАНСА:');
    if (user) {
      console.log('Текущий баланс TON:', user.balance_ton);
      console.log('Ожидаемый баланс с учетом депозита 1.65 TON:', parseFloat(user.balance_ton || '0') + 1.65);
      
      // Подсчет суммы всех успешных TON депозитов
      const tonDeposits = transactions?.filter(tx => 
        tx.type === 'TON_DEPOSIT' && 
        tx.currency === 'TON' && 
        tx.status === 'completed'
      ) || [];
      
      const totalDeposits = tonDeposits.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
      console.log('Сумма всех успешных TON депозитов:', totalDeposits);
      console.log('Разница (баланс - депозиты):', parseFloat(user.balance_ton || '0') - totalDeposits);
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎯 ВЫВОДЫ РАССЛЕДОВАНИЯ:');
    console.log('1. Проверьте есть ли пользователь ID 255 в базе');
    console.log('2. Проверьте есть ли транзакции TON_DEPOSIT для этого пользователя');
    console.log('3. Проверьте tx_hash транзакций - возможно проблема в обработке депозитов');
    console.log('4. Сравните баланс с суммой депозитов');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА РАССЛЕДОВАНИЯ:', error);
  }
}

// Запуск расследования
investigateUser255DepositIssue().catch(console.error);