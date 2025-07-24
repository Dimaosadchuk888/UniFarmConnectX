#!/usr/bin/env npx tsx

/**
 * ДИАГНОСТИКА CONSTRAINT VIOLATIONS 
 * Проверяет нарушения idx_tx_hash_unique_safe для понимания 
 * почему TON депозиты исчезают
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseConstraintViolations() {
  console.log('\n🔍 ДИАГНОСТИКА CONSTRAINT VIOLATIONS');
  console.log('='.repeat(60));
  console.log(`📅 Время: ${new Date().toLocaleString('ru-RU')}`);
  console.log('🎯 Цель: Найти причину исчезающих TON депозитов User #25\n');

  try {
    // 1. Проверяем constraint в базе данных
    console.log('1️⃣ ПРОВЕРКА АКТИВНОСТИ CONSTRAINT idx_tx_hash_unique_safe:');
    
    const { data: constraints, error: constraintError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            conname as constraint_name,
            contype as constraint_type,
            pg_get_constraintdef(oid) as definition
          FROM pg_constraint 
          WHERE conname LIKE '%tx_hash%';
        `
      });

    if (!constraintError && constraints) {
      console.log('📋 Найденные TX_HASH constraints:');
      constraints.forEach((c: any) => {
        console.log(`   ${c.constraint_name}: ${c.definition}`);
      });
    } else {
      console.log('⚠️  Не удалось получить информацию о constraints');
    }

    // 2. Ищем дублирующиеся tx_hash в metadata
    console.log('\n2️⃣ ПОИСК ДУБЛИРУЮЩИХСЯ TX_HASH В METADATA:');
    
    const { data: duplicates, error: duplicateError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_ton, metadata, created_at')
      .not('metadata', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!duplicateError && duplicates) {
      // Группируем по tx_hash из metadata
      const txHashGroups: { [key: string]: any[] } = {};
      
      duplicates.forEach(tx => {
        const metadata = typeof tx.metadata === 'string' 
          ? JSON.parse(tx.metadata) 
          : tx.metadata;
        
        if (metadata?.tx_hash) {
          const txHash = metadata.tx_hash;
          if (!txHashGroups[txHash]) {
            txHashGroups[txHash] = [];
          }
          txHashGroups[txHash].push(tx);
        }
      });

      // Находим дубликаты
      const duplicateHashes = Object.entries(txHashGroups)
        .filter(([_, txs]) => txs.length > 1);

      if (duplicateHashes.length > 0) {
        console.log(`🚨 Найдено ${duplicateHashes.length} дублирующихся tx_hash:`);
        
        duplicateHashes.forEach(([txHash, transactions]) => {
          console.log(`\n📄 TX_HASH: ${txHash.substring(0, 20)}...`);
          transactions.forEach(tx => {
            console.log(`   ID: ${tx.id}, User: ${tx.user_id}, Type: ${tx.type}, Amount: ${tx.amount_ton}, Time: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
          });
        });
      } else {
        console.log('✅ Дублирующихся tx_hash не найдено в последних 100 транзакциях');
      }
    }

    // 3. Ищем специфические транзакции User #25
    console.log('\n3️⃣ ПОИСК ТРАНЗАКЦИЙ USER #25 С TX_HASH:');
    
    const { data: user25Txs, error: user25Error } = await supabase
      .from('transactions')
      .select('id, type, amount_ton, metadata, created_at, status')
      .eq('user_id', 25)
      .not('metadata', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!user25Error && user25Txs && user25Txs.length > 0) {
      console.log(`📋 Найдено ${user25Txs.length} транзакций User #25 с metadata:`);
      
      user25Txs.forEach(tx => {
        const metadata = typeof tx.metadata === 'string' 
          ? JSON.parse(tx.metadata) 
          : tx.metadata;
        
        const txHash = metadata?.tx_hash || 'НЕТ';
        console.log(`   ID: ${tx.id}, Type: ${tx.type}, Amount: ${tx.amount_ton}, TX_HASH: ${txHash.substring(0, 30)}..., Status: ${tx.status}, Time: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
      });
    } else {
      console.log('❌ Транзакции User #25 с metadata не найдены');
    }

    // 4. Проверяем недавние TON_DEPOSIT транзакции
    console.log('\n4️⃣ ПРОВЕРКА НЕДАВНИХ TON_DEPOSIT ТРАНЗАКЦИЙ:');
    
    const { data: tonDeposits, error: tonDepositError } = await supabase
      .from('transactions')
      .select('id, user_id, amount_ton, metadata, created_at, status')
      .in('type', ['TON_DEPOSIT', 'FARMING_REWARD'])
      .gt('amount_ton', 0)
      .gt('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()) // Последние 48 часов
      .order('created_at', { ascending: false });

    if (!tonDepositError && tonDeposits) {
      console.log(`📈 Найдено ${tonDeposits.length} TON депозитов за последние 48 часов:`);
      
      tonDeposits.slice(0, 10).forEach(tx => {
        const metadata = typeof tx.metadata === 'string' 
          ? JSON.parse(tx.metadata) 
          : tx.metadata;
          
        const txHash = metadata?.tx_hash || 'НЕТ';
        const source = metadata?.source || 'НЕИЗВЕСТНО';
        console.log(`   User ${tx.user_id}: ${tx.amount_ton} TON, Source: ${source}, TX_HASH: ${txHash.substring(0, 20)}..., Time: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
      });
    }

    console.log('\n🏁 ДИАГНОСТИКА ЗАВЕРШЕНА');
    console.log('📊 Результат: Проанализированы constraint violations и дублирующиеся транзакции');

  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
  }
}

diagnoseConstraintViolations();