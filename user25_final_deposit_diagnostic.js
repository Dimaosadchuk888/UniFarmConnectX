#!/usr/bin/env node

/**
 * ФИНАЛЬНАЯ ДИАГНОСТИКА ПРОБЛЕМЫ ИСЧЕЗАЮЩИХ ДЕПОЗИТОВ User #25
 * Проверяет все этапы обработки TON депозитов: БД → API → Frontend
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Попробуем найти переменные Supabase (разные варианты)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

console.log('SUPABASE URL variants:');
console.log('- VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅' : '❌');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅' : '❌');
console.log('SUPABASE KEY variants:');
console.log('- VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✅' : '❌');
console.log('- SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅' : '❌');
console.log('- SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✅' : '❌');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Не удалось найти переменные Supabase. Попробуем использовать данные из core/supabaseClient');
  
  // Попробуем получить данные из core/supabaseClient файла
  try {
    const { readFileSync } = await import('fs');
    const supabaseClientCode = readFileSync('./core/supabaseClient.ts', 'utf8');
    console.log('📁 Содержимое core/supabaseClient.ts (первые 500 символов):');
    console.log(supabaseClientCode.substring(0, 500));
    process.exit(1);
  } catch (error) {
    console.error('❌ Ошибка чтения core/supabaseClient.ts:', error.message);
    process.exit(1);
  }
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticUser25DepositFlow() {
  console.log('='.repeat(80));
  console.log('🔍 ФИНАЛЬНАЯ ДИАГНОСТИКА: User #25 TON депозиты');
  console.log('='.repeat(80));

  // 1. ПРОВЕРЯЕМ ТРАНЗАКЦИИ В БД
  console.log('\n1️⃣ ТРАНЗАКЦИИ User #25 В БАЗЕ ДАННЫХ:');
  console.log('-'.repeat(50));
  
  const { data: dbTransactions, error: dbError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 25)
    .order('created_at', { ascending: false })
    .limit(10);

  if (dbError) {
    console.error('❌ Ошибка получения транзакций из БД:', dbError.message);
    return;
  }

  console.log(`📊 Всего транзакций User #25: ${dbTransactions.length}`);
  
  if (dbTransactions.length > 0) {
    console.log('\n📋 Последние транзакции:');
    dbTransactions.forEach((tx, index) => {
      console.log(`${index + 1}. ID: ${tx.id}`);
      console.log(`   Type: ${tx.type}`);
      console.log(`   Currency: ${tx.currency}`);
      console.log(`   Amount: ${tx.amount_uni ? tx.amount_uni + ' UNI' : tx.amount_ton + ' TON'}`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   Created: ${tx.created_at}`);
      console.log(`   Source: ${tx.source || 'N/A'}`);
      console.log(`   Description: ${tx.description || 'N/A'}`);
      console.log('   ---');
    });
  }

  // 2. ФИЛЬТРУЕМ TON ТРАНЗАКЦИИ (как в fetchTonTransactions)
  console.log('\n2️⃣ ФИЛЬТРАЦИЯ TON ТРАНЗАКЦИЙ (FRONTEND LOGIC):');
  console.log('-'.repeat(50));
  
  const tonTransactions = dbTransactions.filter(tx => {
    const currency = (tx.currency || '').toUpperCase();
    const type = (tx.type || '').toLowerCase();
    const source = (tx.source || '').toLowerCase();
    
    const isTonTransaction = currency === 'TON' || 
                            type.includes('ton') ||
                            source.includes('ton') ||
                            type === 'boost_purchase' ||
                            type === 'ton_farming_reward';
    
    if (isTonTransaction) {
      console.log(`✅ TON транзакция найдена: ID ${tx.id}, type: ${tx.type}, currency: ${tx.currency}`);
    }
    
    return isTonTransaction;
  });

  console.log(`🎯 TON транзакций после фильтрации: ${tonTransactions.length}`);

  // 3. ПРОВЕРЯЕМ ФИЛЬТРАЦИЮ FARMING_REWARD с currency TON
  console.log('\n3️⃣ СПЕЦИАЛЬНАЯ ПРОВЕРКА FARMING_REWARD:');
  console.log('-'.repeat(50));
  
  const farmingRewards = dbTransactions.filter(tx => 
    tx.type === 'FARMING_REWARD' && tx.currency === 'TON'
  );
  
  if (farmingRewards.length > 0) {
    console.log(`🌟 Найдено FARMING_REWARD с currency TON: ${farmingRewards.length}`);
    farmingRewards.forEach(tx => {
      console.log(`   - ID: ${tx.id}, Amount: ${tx.amount_ton} TON, Created: ${tx.created_at}`);
    });
  } else {
    console.log('❌ НЕ найдено FARMING_REWARD с currency TON');
  }

  // 4. ПРОВЕРЯЕМ ЕСТЬ ли TON депозиты вообще
  console.log('\n4️⃣ ПОИСК ВОЗМОЖНЫХ TON ДЕПОЗИТОВ:');
  console.log('-'.repeat(50));
  
  const possibleTonDeposits = dbTransactions.filter(tx => {
    return (tx.amount_ton && parseFloat(tx.amount_ton) > 0) ||
           (tx.currency === 'TON') ||
           (tx.type && tx.type.toLowerCase().includes('deposit')) ||
           (tx.source && tx.source.toLowerCase().includes('deposit'));
  });
  
  console.log(`💰 Возможных TON депозитов: ${possibleTonDeposits.length}`);
  possibleTonDeposits.forEach(tx => {
    console.log(`   - ID: ${tx.id}, Type: ${tx.type}, Currency: ${tx.currency}, Amount: ${tx.amount_ton || 'N/A'} TON`);
  });

  // 5. ПРОВЕРЯЕМ БАЛАНС User #25
  console.log('\n5️⃣ ТЕКУЩИЙ БАЛАНС User #25:');
  console.log('-'.repeat(50));
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, username, balance_uni, balance_ton')
    .eq('id', 25)
    .single();

  if (userError) {
    console.error('❌ Ошибка получения пользователя:', userError.message);
  } else {
    console.log(`👤 User #25 (@${user.username || 'N/A'})`);
    console.log(`💰 UNI Balance: ${user.balance_uni || 0}`);
    console.log(`🪙 TON Balance: ${user.balance_ton || 0}`);
  }

  // 6. ПРОВЕРЯЕМ API ОТВЕТ (симуляция backend API)
  console.log('\n6️⃣ СИМУЛЯЦИЯ API ОТВЕТА /api/v2/transactions?currency=TON:');
  console.log('-'.repeat(50));
  
  // Фильтруем как UnifiedTransactionService.getUserTransactions()
  const apiFilteredTransactions = dbTransactions.filter(tx => {
    // Логика из UnifiedTransactionService - фильтрация по currency
    return tx.currency === 'TON';
  });
  
  console.log(`📡 API вернет транзакций с currency=TON: ${apiFilteredTransactions.length}`);
  apiFilteredTransactions.forEach(tx => {
    console.log(`   - ID: ${tx.id}, Type: ${tx.type}, Amount: ${tx.amount_ton} TON`);
  });

  // 7. ИТОГОВЫЙ ДИАГНОЗ
  console.log('\n🏁 ИТОГОВЫЙ ДИАГНОЗ:');
  console.log('='.repeat(50));
  
  const hasTonTransactions = tonTransactions.length > 0;
  const hasFarmingRewardTon = farmingRewards.length > 0;
  const hasApiTonTransactions = apiFilteredTransactions.length > 0;
  
  if (hasTonTransactions && hasApiTonTransactions) {
    console.log('✅ ПРОБЛЕМА НЕ В ФИЛЬТРАЦИИ - TON транзакции есть и в БД и в API');
  } else if (hasTonTransactions && !hasApiTonTransactions) {
    console.log('❌ ПРОБЛЕМА В API ФИЛЬТРАЦИИ - Frontend видит TON, API не возвращает');
  } else if (!hasTonTransactions && hasFarmingRewardTon) {
    console.log('❌ ПРОБЛЕМА В FRONTEND ФИЛЬТРАЦИИ - FARMING_REWARD не распознается как TON');
  } else {
    console.log('❓ НЕЯСНА ПРИЧИНА - требуется дополнительная диагностика');
  }
  
  console.log('\n📋 РЕКОМЕНДАЦИИ:');
  if (!hasTonTransactions && hasFarmingRewardTon) {
    console.log('1. Добавить в fetchTonTransactions() проверку: type === "farming_reward" && currency === "TON"');
  }
  if (hasTonTransactions && !hasApiTonTransactions) {
    console.log('2. Исправить API фильтрацию в UnifiedTransactionService');
  }
  
  console.log('\n' + '='.repeat(80));
}

// Запускаем диагностику
diagnosticUser25DepositFlow().catch(console.error);