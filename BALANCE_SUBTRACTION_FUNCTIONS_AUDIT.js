#!/usr/bin/env node

/**
 * АУДИТ ФУНКЦИЙ СПИСАНИЯ БАЛАНСА - БЕЗ ИЗМЕНЕНИЙ КОДА
 * Проверяет когда и как вызываются функции списания баланса
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditBalanceSubtractionFunctions() {
  console.log('🔍 АУДИТ ФУНКЦИЙ СПИСАНИЯ БАЛАНСА');
  console.log('='.repeat(80));
  console.log(`📅 ${new Date().toLocaleString('ru-RU')}`);
  console.log('⚠️  БЕЗ ИЗМЕНЕНИЙ КОДА - только анализ');
  
  const currentUserId = 184;
  
  // 1. АНАЛИЗ ИСТОЧНИКОВ ТРАНЗАКЦИЙ
  console.log('\n1️⃣ АНАЛИЗ ИСТОЧНИКОВ ТРАНЗАКЦИЙ за последний час');
  console.log('-'.repeat(60));
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data: recentTransactions, error: txError } = await supabase
    .from('transactions')
    .select('id, type, amount_ton, amount_uni, description, source, metadata, created_at')
    .eq('user_id', currentUserId)
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false });

  if (txError) {
    console.error('❌ Ошибка получения транзакций:', txError.message);
    return;
  }

  console.log(`📊 Транзакций за час: ${recentTransactions.length}`);
  
  // Группируем по источникам
  const sourceStats = {};
  recentTransactions.forEach(tx => {
    const source = tx.source || 'unknown';
    if (!sourceStats[source]) {
      sourceStats[source] = { count: 0, totalTon: 0, totalUni: 0, types: new Set() };
    }
    sourceStats[source].count++;
    sourceStats[source].totalTon += parseFloat(tx.amount_ton || 0);
    sourceStats[source].totalUni += parseFloat(tx.amount_uni || 0);
    sourceStats[source].types.add(tx.type);
  });
  
  console.log('\n📋 СТАТИСТИКА ПО ИСТОЧНИКАМ:');
  Object.entries(sourceStats).forEach(([source, stats]) => {
    console.log(`🔧 ${source}:`);
    console.log(`   Транзакций: ${stats.count}`);
    console.log(`   TON: ${stats.totalTon.toFixed(6)} | UNI: ${stats.totalUni.toFixed(6)}`);
    console.log(`   Типы: ${Array.from(stats.types).join(', ')}`);
    console.log('');
  });

  // 2. ПОИСК ПОДОЗРИТЕЛЬНЫХ ИСТОЧНИКОВ
  console.log('\n2️⃣ ПОИСК ПОДОЗРИТЕЛЬНЫХ ИСТОЧНИКОВ СПИСАНИЯ');
  console.log('-'.repeat(60));
  
  const suspiciousSources = [
    'subtractBalance',
    'batch_subtract',
    'BalanceManager',
    'BatchBalanceProcessor',
    'rollback',
    'validation',
    'correction'
  ];
  
  const suspiciousTransactions = recentTransactions.filter(tx => {
    const source = (tx.source || '').toLowerCase();
    const desc = (tx.description || '').toLowerCase();
    const type = (tx.type || '').toLowerCase();
    
    return suspiciousSources.some(suspicious => 
      source.includes(suspicious.toLowerCase()) ||
      desc.includes(suspicious.toLowerCase()) ||
      type.includes(suspicious.toLowerCase())
    );
  });
  
  console.log(`🚨 Подозрительных транзакций: ${suspiciousTransactions.length}`);
  
  if (suspiciousTransactions.length > 0) {
    console.log('\n📋 ДЕТАЛИ ПОДОЗРИТЕЛЬНЫХ ТРАНЗАКЦИЙ:');
    suspiciousTransactions.forEach(tx => {
      console.log(`• ID:${tx.id} | ${tx.created_at.split('T')[1].substring(0, 8)}`);
      console.log(`  Тип: ${tx.type} | Источник: ${tx.source}`);
      console.log(`  TON: ${tx.amount_ton} | UNI: ${tx.amount_uni}`);
      console.log(`  Описание: ${tx.description}`);
      if (tx.metadata) {
        console.log(`  Metadata: ${JSON.stringify(tx.metadata)}`);
      }
      console.log('  ---');
    });
  }

  // 3. АНАЛИЗ HISTORY БАЛАНСОВ
  console.log('\n3️⃣ АНАЛИЗ ИСТОРИИ ИЗМЕНЕНИЙ БАЛАНСА');
  console.log('-'.repeat(60));
  
  // Получаем историю баланса через snapshots транзакций
  const balanceHistory = [];
  let runningTon = 0;
  let runningUni = 0;
  
  // Сортируем по времени создания
  const sortedTx = [...recentTransactions].reverse();
  
  sortedTx.forEach(tx => {
    const tonAmount = parseFloat(tx.amount_ton || 0);
    const uniAmount = parseFloat(tx.amount_uni || 0);
    
    // Определяем операцию
    if (tx.type === 'REFERRAL_REWARD' || tx.type === 'FARMING_REWARD') {
      runningTon += tonAmount;
      runningUni += uniAmount;
    }
    
    balanceHistory.push({
      time: tx.created_at.split('T')[1].substring(0, 8),
      type: tx.type,
      tonChange: tonAmount,
      uniChange: uniAmount,
      tonBalance: runningTon,
      uniBalance: runningUni,
      source: tx.source
    });
  });
  
  console.log('\n📊 ХРОНОЛОГИЯ ИЗМЕНЕНИЙ БАЛАНСА (последние 10):');
  console.log('Время    | Тип           | TON Δ    | UNI Δ     | TON Баланс | Источник');
  console.log('-'.repeat(85));
  
  balanceHistory.slice(-10).forEach(entry => {
    const tonDelta = entry.tonChange > 0 ? `+${entry.tonChange}` : `${entry.tonChange}`;
    const uniDelta = entry.uniChange > 0 ? `+${entry.uniChange}` : `${entry.uniChange}`;
    
    console.log(`${entry.time} | ${String(entry.type).padEnd(13)} | ${String(tonDelta).padEnd(8)} | ${String(uniDelta).padEnd(9)} | ${String(entry.tonBalance.toFixed(6))} | ${entry.source || 'N/A'}`);
  });

  // 4. ТЕКУЩИЙ ФАКТИЧЕСКИЙ БАЛАНС VS РАСЧЕТНЫЙ
  console.log('\n4️⃣ СРАВНЕНИЕ РАСЧЕТНОГО И ФАКТИЧЕСКОГО БАЛАНСА');
  console.log('-'.repeat(60));
  
  const { data: currentUser } = await supabase
    .from('users')
    .select('balance_ton, balance_uni')
    .eq('id', currentUserId)
    .single();
  
  if (currentUser && balanceHistory.length > 0) {
    const lastEntry = balanceHistory[balanceHistory.length - 1];
    const actualTon = parseFloat(currentUser.balance_ton);
    const actualUni = parseFloat(currentUser.balance_uni);
    
    console.log(`💰 ФАКТИЧЕСКИЙ БАЛАНС:`);
    console.log(`   TON: ${actualTon}`);
    console.log(`   UNI: ${actualUni}`);
    
    console.log(`📊 РАСЧЕТНЫЙ БАЛАНС (по транзакциям за час):`);
    console.log(`   TON: ${lastEntry.tonBalance.toFixed(6)}`);
    console.log(`   UNI: ${lastEntry.uniBalance.toFixed(6)}`);
    
    const tonDiscrepancy = actualTon - lastEntry.tonBalance;
    const uniDiscrepancy = actualUni - lastEntry.uniBalance;
    
    console.log(`⚠️  РАСХОЖДЕНИЕ:`);
    console.log(`   TON: ${tonDiscrepancy.toFixed(6)} (${tonDiscrepancy > 0 ? 'избыток' : 'недостаток'})`);
    console.log(`   UNI: ${uniDiscrepancy.toFixed(6)} (${uniDiscrepancy > 0 ? 'избыток' : 'недостаток'})`);
    
    if (Math.abs(tonDiscrepancy) > 0.001 || Math.abs(uniDiscrepancy) > 0.001) {
      console.log('\n🚨 ОБНАРУЖЕНО ЗНАЧИТЕЛЬНОЕ РАСХОЖДЕНИЕ!');
      console.log('   Возможные причины:');
      console.log('   • Автоматическое списание через BalanceManager.subtractBalance()');
      console.log('   • Массовые операции BatchBalanceProcessor.processBulkSubtract()');
      console.log('   • Транзакции не созданные через систему');
      console.log('   • Прямые UPDATE запросы к таблице users');
    }
  }

  // 5. ПОИСК ПРЯМЫХ ОБНОВЛЕНИЙ БАЛАНСА
  console.log('\n5️⃣ РЕКОМЕНДАЦИИ ПО ДАЛЬНЕЙШЕМУ ИССЛЕДОВАНИЮ');
  console.log('-'.repeat(60));
  
  console.log('📋 ПРОВЕРИТЬ СЛЕДУЮЩИЕ ПРОЦЕССЫ:');
  console.log('1. Логи вызовов BalanceManager.subtractBalance() за последний час');
  console.log('2. Активность BatchBalanceProcessor.processBulkSubtract()');
  console.log('3. Прямые UPDATE запросы к таблице users без создания транзакций');
  console.log('4. WebSocket уведомления, которые могут триггерить списания');
  console.log('5. Автоматические процессы коррекции/валидации балансов');
  
  if (suspiciousTransactions.length === 0) {
    console.log('\n⚠️  КРИТИЧНАЯ НАХОДКА:');
    console.log('   НЕ НАЙДЕНО транзакций списания в истории!');
    console.log('   Это означает, что баланс списывается БЕЗ создания транзакций');
    console.log('   Скорее всего используются прямые UPDATE запросы к БД');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 АУДИТ ФУНКЦИЙ СПИСАНИЯ ЗАВЕРШЕН');
  console.log('='.repeat(80));
}

auditBalanceSubtractionFunctions().catch(console.error);