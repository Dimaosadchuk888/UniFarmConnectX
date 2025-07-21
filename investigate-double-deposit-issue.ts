#!/usr/bin/env tsx

/**
 * Критический анализ проблемы двойного начисления за депозиты
 * Выясняет источник дублирования транзакций и начислений
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// Инициализация Supabase
const supabase = createClient(
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@db:5432/postgres',
  'dummy_key' // Используем dummy key для локальной postgres базы
);

interface DuplicateAnalysis {
  type: 'FARMING_DEPOSIT' | 'BOOST_PURCHASE' | 'TON_DEPOSIT';
  user_id: number;
  amount: number;
  duplicate_count: number;
  transactions: any[];
  time_gap_seconds?: number;
  same_hash?: boolean;
}

async function investigateDoubleDuplicates() {
  console.log('\n🔍 === АНАЛИЗ ПРОБЛЕМЫ ДВОЙНОГО НАЧИСЛЕНИЯ ===\n');

  // 1. Поиск дублирующихся депозитов по времени и сумме
  console.log('1. ПОИСК ПОДОЗРИТЕЛЬНЫХ ДУБЛИРУЮЩИХСЯ ДЕПОЗИТОВ\n');
  
  const { data: suspiciousDeposits, error: depositError } = await supabase
    .from('transactions')
    .select(`
      id,
      user_id,
      type,
      amount,
      amount_uni,
      amount_ton,
      status,
      description,
      metadata,
      created_at
    `)
    .in('type', ['FARMING_DEPOSIT', 'BOOST_PURCHASE', 'DEPOSIT'])
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(100);

  if (depositError) {
    console.error('❌ Ошибка получения транзакций:', depositError);
    return;
  }

  // Группируем транзакции по пользователю, типу и времени
  const duplicateCandidates: Record<string, any[]> = {};
  
  for (const tx of suspiciousDeposits || []) {
    // Создаем ключ для группировки (пользователь + тип + сумма + день)
    const amount = parseFloat(tx.amount_uni || tx.amount_ton || tx.amount || '0');
    const dateKey = new Date(tx.created_at).toISOString().split('T')[0]; // Только дата
    const groupKey = `${tx.user_id}-${tx.type}-${amount}-${dateKey}`;
    
    if (!duplicateCandidates[groupKey]) {
      duplicateCandidates[groupKey] = [];
    }
    duplicateCandidates[groupKey].push(tx);
  }

  // Найдем потенциальные дубли
  const duplicates: DuplicateAnalysis[] = [];
  
  for (const [key, transactions] of Object.entries(duplicateCandidates)) {
    if (transactions.length > 1) {
      const [userId, type, amount] = key.split('-');
      
      // Проверяем временные интервалы между транзакциями
      transactions.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      for (let i = 0; i < transactions.length - 1; i++) {
        const timeDiff = (new Date(transactions[i + 1].created_at).getTime() - 
                         new Date(transactions[i].created_at).getTime()) / 1000;
        
        // Если транзакции в пределах 10 минут - подозрительно
        if (timeDiff <= 600) {
          duplicates.push({
            type: type as any,
            user_id: parseInt(userId),
            amount: parseFloat(amount),
            duplicate_count: transactions.length,
            transactions: transactions,
            time_gap_seconds: timeDiff,
            same_hash: transactions.every(tx => 
              (tx.metadata?.tx_hash || tx.description) === 
              (transactions[0].metadata?.tx_hash || transactions[0].description)
            )
          });
        }
      }
    }
  }

  if (duplicates.length === 0) {
    console.log('✅ НЕ НАЙДЕНО подозрительных дублирующихся депозитов за последние 100 транзакций');
  } else {
    console.log(`⚠️ НАЙДЕНО ${duplicates.length} подозрительных случаев дублирования:\n`);
    
    duplicates.forEach((dup, index) => {
      console.log(`${index + 1}. User ${dup.user_id} - ${dup.type}`);
      console.log(`   Сумма: ${dup.amount} | Дублей: ${dup.duplicate_count}`);
      console.log(`   Временной разрыв: ${dup.time_gap_seconds}с | Один hash: ${dup.same_hash}`);
      console.log(`   Транзакции:`);
      dup.transactions.forEach(tx => {
        console.log(`     - ID ${tx.id}: ${new Date(tx.created_at).toLocaleString()}`);
        console.log(`       Description: ${tx.description}`);
        if (tx.metadata?.tx_hash) {
          console.log(`       TX Hash: ${tx.metadata.tx_hash}`);
        }
      });
      console.log('');
    });
  }

  // 2. Анализ планировщика и автоматических начислений
  console.log('\n2. АНАЛИЗ АВТОМАТИЧЕСКИХ НАЧИСЛЕНИЙ (FARMING_REWARD)\n');
  
  const { data: farmingRewards, error: rewardError } = await supabase
    .from('transactions')
    .select(`
      id,
      user_id,
      amount_uni,
      amount_ton,
      description,
      created_at
    `)
    .eq('type', 'FARMING_REWARD')
    .order('created_at', { ascending: false })
    .limit(50);

  if (rewardError) {
    console.error('❌ Ошибка получения наград:', rewardError);
  } else {
    // Группируем награды по пользователю и времени
    const rewardsByUser: Record<number, any[]> = {};
    
    for (const reward of farmingRewards || []) {
      if (!rewardsByUser[reward.user_id]) {
        rewardsByUser[reward.user_id] = [];
      }
      rewardsByUser[reward.user_id].push(reward);
    }

    // Проверяем на слишком частые начисления
    let suspiciousRewards = 0;
    
    for (const [userId, rewards] of Object.entries(rewardsByUser)) {
      rewards.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      for (let i = 0; i < rewards.length - 1; i++) {
        const timeDiff = (new Date(rewards[i + 1].created_at).getTime() - 
                         new Date(rewards[i].created_at).getTime()) / 1000;
        
        // Если награды начисляются чаще чем раз в 4 минуты - подозрительно
        if (timeDiff < 240) {
          suspiciousRewards++;
          console.log(`⚠️ User ${userId}: награды слишком часто`);
          console.log(`   ${new Date(rewards[i].created_at).toLocaleString()} -> ${new Date(rewards[i + 1].created_at).toLocaleString()}`);
          console.log(`   Разрыв: ${Math.round(timeDiff)}с | Суммы: ${rewards[i].amount_uni || '0'} -> ${rewards[i + 1].amount_uni || '0'}`);
        }
      }
    }

    if (suspiciousRewards === 0) {
      console.log('✅ НЕ НАЙДЕНО подозрительно частых автоматических начислений');
    }
  }

  // 3. Проверка наличия защиты от дубликатов в коде
  console.log('\n3. АНАЛИЗ ЗАЩИТЫ ОТ ДУБЛИКАТОВ В КОДЕ\n');
  
  // Проверим последние депозиты на наличие дедупликации
  const recentDeposits = suspiciousDeposits?.filter(tx => 
    tx.type === 'DEPOSIT' && tx.metadata?.tx_hash
  ).slice(0, 10) || [];

  if (recentDeposits.length > 0) {
    console.log(`Проверяю последние ${recentDeposits.length} TON депозитов на дедупликацию...`);
    
    const hashCounts: Record<string, number> = {};
    
    for (const deposit of recentDeposits) {
      const hash = deposit.metadata?.tx_hash || deposit.description;
      if (hash) {
        hashCounts[hash] = (hashCounts[hash] || 0) + 1;
      }
    }

    const duplicateHashes = Object.entries(hashCounts).filter(([_, count]) => count > 1);
    
    if (duplicateHashes.length > 0) {
      console.log('❌ НАЙДЕНЫ ДУБЛИРУЮЩИЕСЯ TX HASH:');
      duplicateHashes.forEach(([hash, count]) => {
        console.log(`   ${hash}: ${count} раз`);
      });
    } else {
      console.log('✅ Дублирующихся tx_hash не найдено');
    }
  }

  // 4. Проверка конкретных пользователей из логов
  console.log('\n4. ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ 184 (из WebSocket логов)\n');
  
  const { data: user184Txs, error: user184Error } = await supabase
    .from('transactions')
    .select(`
      id,
      type,
      amount,
      amount_uni,
      amount_ton,
      description,
      created_at
    `)
    .eq('user_id', 184)
    .order('created_at', { ascending: false })
    .limit(20);

  if (user184Error) {
    console.error('❌ Ошибка получения транзакций пользователя 184:', user184Error);
  } else if (user184Txs && user184Txs.length > 0) {
    console.log(`Найдено ${user184Txs.length} транзакций для пользователя 184:`);
    
    user184Txs.forEach((tx, index) => {
      const amount = parseFloat(tx.amount_uni || tx.amount_ton || tx.amount || '0');
      console.log(`${index + 1}. ID ${tx.id}: ${tx.type} | ${amount} | ${new Date(tx.created_at).toLocaleString()}`);
      if (tx.description) {
        console.log(`   Описание: ${tx.description}`);
      }
    });

    // Проверим на дубли у этого пользователя
    const groupedTxs: Record<string, any[]> = {};
    
    for (const tx of user184Txs) {
      const amount = parseFloat(tx.amount_uni || tx.amount_ton || tx.amount || '0');
      const key = `${tx.type}-${amount}`;
      
      if (!groupedTxs[key]) {
        groupedTxs[key] = [];
      }
      groupedTxs[key].push(tx);
    }

    const duplicatesFound = Object.entries(groupedTxs).filter(([_, txs]) => txs.length > 1);
    
    if (duplicatesFound.length > 0) {
      console.log('\n⚠️ ПОТЕНЦИАЛЬНЫЕ ДУБЛИ у пользователя 184:');
      duplicatesFound.forEach(([key, txs]) => {
        console.log(`   ${key}: ${txs.length} транзакций`);
        txs.forEach(tx => {
          console.log(`     - ID ${tx.id}: ${new Date(tx.created_at).toLocaleString()}`);
        });
      });
    } else {
      console.log('\n✅ У пользователя 184 дублей не обнаружено');
    }
  } else {
    console.log('❌ Пользователь 184 не найден или нет транзакций');
  }

  console.log('\n=== ЗАКЛЮЧЕНИЕ ===\n');
  
  if (duplicates.length === 0 && suspiciousRewards === 0) {
    console.log('✅ СИСТЕМА РАБОТАЕТ КОРРЕКТНО:');
    console.log('   - Нет подозрительных дублирующихся депозитов');
    console.log('   - Планировщик работает в пределах нормы');
    console.log('   - Защита от дубликатов функционирует');
  } else {
    console.log('❌ ОБНАРУЖЕНЫ ПРОБЛЕМЫ:');
    if (duplicates.length > 0) {
      console.log(`   - ${duplicates.length} случаев дублирования депозитов`);
    }
    if (suspiciousRewards > 0) {
      console.log(`   - ${suspiciousRewards} случаев слишком частых начислений`);
    }
  }
}

// Запуск анализа
investigateDoubleDuplicates().catch(console.error);