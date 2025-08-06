#!/usr/bin/env tsx
/**
 * Скрипт проверки консистентности балансов
 * Запускать вручную или по cron для проверки корректности данных
 */

import { supabase } from '../core/supabase';
import { logger } from '../server/logger';

interface BalanceDiscrepancy {
  user_id: number;
  telegram_id: number;
  username: string;
  sum_deposits_ton: number;
  sum_rewards_ton: number;
  sum_withdrawals_ton: number;
  calculated_balance: number;
  actual_balance: number;
  difference: number;
}

async function checkBalanceConsistency(): Promise<void> {
  console.log('🔍 Начинаем проверку консистентности балансов...\n');

  try {
    // Получаем всех пользователей с балансами
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_ton')
      .gt('balance_ton', 0)
      .order('id');

    if (usersError) {
      throw new Error(`Ошибка получения пользователей: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      console.log('✅ Нет пользователей с положительным балансом TON');
      return;
    }

    console.log(`📊 Проверяем ${users.length} пользователей с балансом TON > 0\n`);

    const discrepancies: BalanceDiscrepancy[] = [];

    for (const user of users) {
      // Получаем все TON транзакции пользователя
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('type, amount_ton, status')
        .eq('user_id', user.id)
        .in('status', ['completed', 'confirmed'])
        .not('amount_ton', 'is', null);

      if (txError) {
        console.error(`❌ Ошибка получения транзакций для user_id ${user.id}:`, txError.message);
        continue;
      }

      // Подсчитываем суммы по типам транзакций
      let sumDeposits = 0;
      let sumRewards = 0;
      let sumWithdrawals = 0;

      if (transactions) {
        for (const tx of transactions) {
          const amount = parseFloat(tx.amount_ton || '0');
          
          if (tx.type === 'TON_DEPOSIT') {
            sumDeposits += amount;
          } else if (tx.type === 'WITHDRAWAL' || tx.type === 'TON_WITHDRAWAL') {
            sumWithdrawals += amount;
          } else if (tx.type.includes('REWARD') || tx.type.includes('BONUS')) {
            sumRewards += amount;
          }
        }
      }

      // Рассчитываем ожидаемый баланс
      const calculatedBalance = sumDeposits + sumRewards - sumWithdrawals;
      const actualBalance = parseFloat(user.balance_ton || '0');
      const difference = Math.abs(calculatedBalance - actualBalance);

      // Если разница больше 0.000001 TON (6 знаков после запятой), считаем это расхождением
      if (difference > 0.000001) {
        discrepancies.push({
          user_id: user.id,
          telegram_id: user.telegram_id,
          username: user.username || 'Unknown',
          sum_deposits_ton: sumDeposits,
          sum_rewards_ton: sumRewards,
          sum_withdrawals_ton: sumWithdrawals,
          calculated_balance: calculatedBalance,
          actual_balance: actualBalance,
          difference
        });
      }
    }

    // Выводим результаты
    if (discrepancies.length === 0) {
      console.log('✅ Все балансы консистентны! Расхождений не найдено.\n');
    } else {
      console.log(`⚠️ Найдено ${discrepancies.length} расхождений:\n`);
      
      // Таблица с расхождениями
      console.table(discrepancies.map(d => ({
        'User ID': d.user_id,
        'Username': d.username,
        'Deposits': d.sum_deposits_ton.toFixed(6),
        'Rewards': d.sum_rewards_ton.toFixed(6),
        'Withdrawals': d.sum_withdrawals_ton.toFixed(6),
        'Calculated': d.calculated_balance.toFixed(6),
        'Actual': d.actual_balance.toFixed(6),
        'Difference': d.difference.toFixed(6)
      })));

      // Логируем в файл для последующего анализа
      logger.warn('[BalanceConsistency] Найдены расхождения:', {
        count: discrepancies.length,
        total_difference: discrepancies.reduce((sum, d) => sum + d.difference, 0),
        discrepancies
      });
    }

    // Проверяем транзакции с фейковыми хэшами (SHA256 = 64 символа)
    const { data: suspiciousTransactions, error: suspiciousError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_ton, tx_hash_unique, created_at')
      .eq('type', 'TON_DEPOSIT')
      .not('tx_hash_unique', 'is', null);

    if (!suspiciousError && suspiciousTransactions) {
      const fakehashes = suspiciousTransactions.filter(tx => 
        tx.tx_hash_unique && tx.tx_hash_unique.length === 64
      );

      if (fakehashes.length > 0) {
        console.log(`\n⚠️ Найдено ${fakehashes.length} транзакций с подозрительными хэшами (возможно SHA256):`);
        console.table(fakehashes.slice(0, 10).map(tx => ({
          'ID': tx.id,
          'User ID': tx.user_id,
          'Amount': tx.amount_ton,
          'Hash': tx.tx_hash_unique?.substring(0, 16) + '...',
          'Date': new Date(tx.created_at).toLocaleDateString()
        })));

        if (fakehashes.length > 10) {
          console.log(`... и еще ${fakehashes.length - 10} транзакций`);
        }
      }
    }

    console.log('\n✅ Проверка завершена');

  } catch (error) {
    console.error('❌ Критическая ошибка при проверке консистентности:', error);
    logger.error('[BalanceConsistency] Критическая ошибка:', error);
    process.exit(1);
  }
}

// Запуск проверки
checkBalanceConsistency()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Неожиданная ошибка:', error);
    process.exit(1);
  });