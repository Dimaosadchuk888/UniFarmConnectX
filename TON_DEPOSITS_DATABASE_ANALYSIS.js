#!/usr/bin/env node

/**
 * АНАЛИЗ ФИКСАЦИИ TON ДЕПОЗИТОВ В БАЗЕ ДАННЫХ
 * Проверяет куда и как система записывает TON депозиты
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeTonDepositsStorage() {
  console.log('🔍 АНАЛИЗ ФИКСАЦИИ TON ДЕПОЗИТОВ В БАЗЕ ДАННЫХ');
  console.log('='.repeat(80));
  
  // 1. ПОИСК ТРАНЗАКЦИЙ С BLOCKCHAIN ХЕШАМИ
  console.log('\n1️⃣ ПОИСК ТРАНЗАКЦИЙ С BLOCKCHAIN ХЕШАМИ');
  console.log('-'.repeat(60));
  
  const { data: txWithHashes, error: hashError } = await supabase
    .from('transactions')
    .select('*')
    .like('description', '%blockchain%')
    .order('created_at', { ascending: false })
    .limit(20);

  if (hashError) {
    console.error('❌ Ошибка поиска blockchain транзакций:', hashError.message);
  } else {
    console.log(`📊 Найдено транзакций с "blockchain": ${txWithHashes.length}`);
    
    if (txWithHashes.length > 0) {
      console.log('\n📋 ПРИМЕРЫ BLOCKCHAIN ТРАНЗАКЦИЙ:');
      txWithHashes.slice(0, 5).forEach(tx => {
        console.log(`• ID: ${tx.id} | User: ${tx.user_id} | ${tx.created_at.split('T')[0]}`);
        console.log(`  Type: ${tx.type} | Currency: ${tx.currency}`);
        console.log(`  Amount TON: ${tx.amount_ton} | Amount UNI: ${tx.amount_uni}`);
        console.log(`  Description: ${tx.description}`);
        console.log(`  Status: ${tx.status} | Source: ${tx.source || 'N/A'}`);
        console.log(`  Metadata: ${tx.metadata ? JSON.stringify(tx.metadata) : 'N/A'}`);
        console.log('  ---');
      });
    }
  }

  // 2. ПОИСК ПО КОНКРЕТНЫМ ПАТТЕРНАМ TON ДЕПОЗИТОВ
  console.log('\n2️⃣ ПОИСК ПО ПАТТЕРНАМ TON ДЕПОЗИТОВ');
  console.log('-'.repeat(60));
  
  const searchPatterns = [
    'TON deposit',
    'ton deposit', 
    'deposit from blockchain',
    'TON_DEPOSIT',
    'ton_deposit'
  ];

  for (const pattern of searchPatterns) {
    const { data: patternTx, error: patternError } = await supabase
      .from('transactions')
      .select('*')
      .like('description', `%${pattern}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!patternError && patternTx.length > 0) {
      console.log(`🎯 Паттерн "${pattern}": ${patternTx.length} транзакций`);
      patternTx.slice(0, 3).forEach(tx => {
        console.log(`   • ID:${tx.id} User:${tx.user_id} Type:${tx.type} Amount:${tx.amount_ton} TON`);
      });
    } else {
      console.log(`❌ Паттерн "${pattern}": не найдено`);
    }
  }

  // 3. АНАЛИЗ METADATA ПОЛЕЙ
  console.log('\n3️⃣ АНАЛИЗ METADATA В ТРАНЗАКЦИЯХ');
  console.log('-'.repeat(60));
  
  const { data: metadataTx, error: metaError } = await supabase
    .from('transactions')
    .select('*')
    .not('metadata', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (metaError) {
    console.error('❌ Ошибка получения metadata:', metaError.message);
  } else {
    console.log(`📊 Транзакций с metadata: ${metadataTx.length}`);
    
    // Ищем TON-связанные metadata
    const tonMetadata = metadataTx.filter(tx => {
      const meta = tx.metadata;
      return meta && (
        meta.tx_hash ||
        meta.wallet_address ||
        meta.source === 'ton_deposit' ||
        meta.original_type === 'TON_DEPOSIT'
      );
    });
    
    console.log(`🪙 TON metadata транзакций: ${tonMetadata.length}`);
    
    if (tonMetadata.length > 0) {
      console.log('\n📋 ПРИМЕРЫ TON METADATA:');
      tonMetadata.slice(0, 5).forEach(tx => {
        console.log(`• ID: ${tx.id} | User: ${tx.user_id} | ${tx.created_at.split('T')[0]}`);
        console.log(`  Type: ${tx.type} | Amount: ${tx.amount_ton} TON`);
        console.log(`  Metadata: ${JSON.stringify(tx.metadata, null, 2)}`);
        console.log('  ---');
      });
    }
  }

  // 4. ПРОВЕРКА tx_hash_unique ПОЛЯ
  console.log('\n4️⃣ АНАЛИЗ ПОЛЯ tx_hash_unique');
  console.log('-'.repeat(60));
  
  const { data: txHashUnique, error: txHashError } = await supabase
    .from('transactions')
    .select('id, user_id, type, tx_hash_unique, created_at, description')
    .not('tx_hash_unique', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);

  if (txHashError) {
    console.error('❌ Ошибка получения tx_hash_unique:', txHashError.message);
  } else {
    console.log(`📊 Транзакций с tx_hash_unique: ${txHashUnique.length}`);
    
    if (txHashUnique.length > 0) {
      console.log('\n📋 ПРИМЕРЫ tx_hash_unique:');
      txHashUnique.slice(0, 5).forEach(tx => {
        console.log(`• ID: ${tx.id} | User: ${tx.user_id} | Type: ${tx.type}`);
        console.log(`  tx_hash_unique: ${tx.tx_hash_unique}`);
        console.log(`  Description: ${tx.description}`);
        console.log(`  Дата: ${tx.created_at.split('T')[0]}`);
        console.log('  ---');
      });
    }
  }

  // 5. ИТОГОВАЯ СВОДКА
  console.log('\n5️⃣ ИТОГОВАЯ СВОДКА ФИКСАЦИИ TON ДЕПОЗИТОВ');
  console.log('='.repeat(60));
  
  const blockchainTxCount = txWithHashes?.length || 0;
  const metadataTxCount = tonMetadata?.length || 0;
  const hashUniqueCount = txHashUnique?.length || 0;
  
  console.log(`📊 СТАТИСТИКА ЗАПИСИ TON ДЕПОЗИТОВ:`);
  console.log(`   • Транзакций с "blockchain": ${blockchainTxCount}`);
  console.log(`   • Транзакций с TON metadata: ${metadataTxCount}`);
  console.log(`   • Транзакций с tx_hash_unique: ${hashUniqueCount}`);
  
  if (blockchainTxCount === 0 && metadataTxCount === 0) {
    console.log('\n🚨 КРИТИЧНЫЙ ВЫВОД:');
    console.log('   СИСТЕМА НЕ ЗАПИСЫВАЕТ TON ДЕПОЗИТЫ С BLOCKCHAIN ДАННЫМИ!');
    console.log('   Отсутствуют транзакции с хешами и wallet адресами.');
  } else {
    console.log('\n✅ СИСТЕМА ЗАПИСЫВАЕТ TON ДЕПОЗИТЫ:');
    console.log('   Найдены транзакции с blockchain данными и metadata.');
  }
  
  console.log('\n' + '='.repeat(80));
}

analyzeTonDepositsStorage().catch(console.error);