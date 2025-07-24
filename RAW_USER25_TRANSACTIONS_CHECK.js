#!/usr/bin/env node

/**
 * ПРОВЕРКА СЫРЫХ ДАННЫХ User #25 - БЕЗ ФИЛЬТРОВ
 * Покажет ВСЕ транзакции и найдет где пропали TON депозиты
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRawUser25Data() {
  console.log('🔍 ПРОВЕРКА СЫРЫХ ДАННЫХ User #25 - БЕЗ ФИЛЬТРОВ');
  console.log('='.repeat(80));
  
  // 1. ВСЕ ТРАНЗАКЦИИ User #25 (последние 100)
  console.log('\n1️⃣ СЫРЫЕ ДАННЫЕ - ПОСЛЕДНИЕ 100 ТРАНЗАКЦИЙ User #25');
  console.log('-'.repeat(60));
  
  const { data: allTransactions, error: txError } = await supabase
    .from('transactions')
    .select('id, type, amount_ton, amount_uni, currency, description, created_at')
    .eq('user_id', 25)
    .order('created_at', { ascending: false })
    .limit(100);

  if (txError) {
    console.error('❌ Ошибка получения транзакций:', txError.message);
    return;
  }

  console.log(`📊 Найдено транзакций: ${allTransactions.length}`);
  
  // Анализируем по amount_ton
  const withAmountTon = allTransactions.filter(tx => parseFloat(tx.amount_ton || 0) > 0);
  const withTonCurrency = allTransactions.filter(tx => tx.currency === 'TON');
  const withTonInDescription = allTransactions.filter(tx => 
    tx.description && tx.description.toLowerCase().includes('ton')
  );
  
  console.log(`🪙 С amount_ton > 0: ${withAmountTon.length}`);
  console.log(`💰 С currency=TON: ${withTonCurrency.length}`);
  console.log(`📝 С 'TON' в описании: ${withTonInDescription.length}`);
  
  // Показываем примеры каждого типа
  console.log('\n📋 ПРИМЕРЫ ТРАНЗАКЦИЙ С amount_ton > 0:');
  withAmountTon.slice(0, 10).forEach(tx => {
    console.log(`• ID:${tx.id} | ${tx.created_at.split('T')[0]} | ${tx.type} | ${tx.amount_ton} TON`);
    console.log(`  Описание: ${(tx.description || '').substring(0, 80)}...`);
  });
  
  console.log('\n📋 ПРИМЕРЫ ТРАНЗАКЦИЙ С currency=TON:');
  withTonCurrency.slice(0, 10).forEach(tx => {
    console.log(`• ID:${tx.id} | ${tx.created_at.split('T')[0]} | ${tx.type} | ${tx.amount_ton} TON`);
    console.log(`  Описание: ${(tx.description || '').substring(0, 80)}...`);
  });

  console.log('\n📋 ПРИМЕРЫ С TON В ОПИСАНИИ:');
  withTonInDescription.slice(0, 10).forEach(tx => {
    console.log(`• ID:${tx.id} | ${tx.created_at.split('T')[0]} | ${tx.type} | ${tx.amount_ton} TON`);
    console.log(`  Описание: ${(tx.description || '').substring(0, 80)}...`);
  });

  // 2. ПОИСК КОНКРЕТНЫХ BLOCKCHAIN ДЕПОЗИТОВ
  console.log('\n2️⃣ ПОИСК BLOCKCHAIN ДЕПОЗИТОВ User #25');
  console.log('-'.repeat(60));
  
  const blockchainDeposits = allTransactions.filter(tx => 
    tx.description && tx.description.includes('blockchain')
  );
  
  console.log(`🔗 Найдено blockchain депозитов: ${blockchainDeposits.length}`);
  
  if (blockchainDeposits.length > 0) {
    console.log('📋 ДЕТАЛИ BLOCKCHAIN ДЕПОЗИТОВ:');
    blockchainDeposits.forEach(tx => {
      console.log(`• ID:${tx.id} | ${tx.created_at.split('T')[0]} | Type:${tx.type}`);
      console.log(`  Amount TON: ${tx.amount_ton} | Currency: ${tx.currency}`);
      console.log(`  Описание: ${tx.description}`);
      console.log('  ---');
    });
  }
  
  // 3. СТАТИСТИКА ПО ТИПАМ
  console.log('\n3️⃣ СТАТИСТИКА ПО ТИПАМ ТРАНЗАКЦИЙ');
  console.log('-'.repeat(60));
  
  const typeStats = {};
  allTransactions.forEach(tx => {
    const key = `${tx.type}-${tx.currency}`;
    if (!typeStats[key]) {
      typeStats[key] = { count: 0, totalTon: 0, totalUni: 0 };
    }
    typeStats[key].count++;
    typeStats[key].totalTon += parseFloat(tx.amount_ton || 0);
    typeStats[key].totalUni += parseFloat(tx.amount_uni || 0);
  });
  
  console.log('📊 СТАТИСТИКА ПО ТИПАМ:');
  Object.entries(typeStats).forEach(([type, stats]) => {
    if (stats.totalTon > 0) {
      console.log(`🪙 ${type}: ${stats.count} шт, ${stats.totalTon.toFixed(6)} TON`);
    } else {
      console.log(`   ${type}: ${stats.count} шт, ${stats.totalUni.toFixed(6)} UNI`);
    }
  });

  // 4. РАСЧЕТ БАЛАНСА ПО ВСЕМ ТРАНЗАКЦИЯМ
  console.log('\n4️⃣ РАСЧЕТ БАЛАНСА ПО ВСЕМ ТРАНЗАКЦИЯМ');
  console.log('-'.repeat(60));
  
  let totalTonBalance = 0;
  let totalUniBalance = 0;
  
  allTransactions.forEach(tx => {
    const tonAmount = parseFloat(tx.amount_ton || 0);
    const uniAmount = parseFloat(tx.amount_uni || 0);
    
    // Для расчета считаем все FARMING_REWARD и REFERRAL_REWARD как доходы
    if (['FARMING_REWARD', 'REFERRAL_REWARD'].includes(tx.type)) {
      totalTonBalance += tonAmount;
      totalUniBalance += uniAmount;
    } else if (tx.type?.includes('WITHDRAWAL')) {
      totalTonBalance -= tonAmount;
      totalUniBalance -= uniAmount;
    }
    // Остальные типы пока не учитываем
  });
  
  console.log(`💰 РАСЧЕТНЫЙ БАЛАНС по 100 транзакциям:`);
  console.log(`   TON: ${totalTonBalance.toFixed(6)}`);
  console.log(`   UNI: ${totalUniBalance.toFixed(6)}`);
  
  // 5. ПРОВЕРКА ФАКТИЧЕСКОГО БАЛАНСА
  const { data: userData } = await supabase
    .from('users')
    .select('balance_ton, balance_uni')
    .eq('id', 25)
    .single();
  
  if (userData) {
    console.log(`\n💰 ФАКТИЧЕСКИЙ БАЛАНС:`);
    console.log(`   TON: ${userData.balance_ton}`);
    console.log(`   UNI: ${userData.balance_uni}`);
    
    const tonDiff = parseFloat(userData.balance_ton) - totalTonBalance;
    const uniDiff = parseFloat(userData.balance_uni) - totalUniBalance;
    
    console.log(`\n⚠️  РАЗНИЦА:`);
    console.log(`   TON: ${tonDiff.toFixed(6)} (${tonDiff > 0 ? 'избыток' : 'недостаток'})`);
    console.log(`   UNI: ${uniDiff.toFixed(6)} (${uniDiff > 0 ? 'избыток' : 'недостаток'})`);
  }
  
  console.log('\n' + '='.repeat(80));
}

checkRawUser25Data().catch(console.error);