#!/usr/bin/env node

/**
 * ДИАГНОСТИКА РЕАЛЬНОГО ВРЕМЕНИ: Списание баланса после пополнения
 * БЕЗ ИЗМЕНЕНИЙ КОДА - только мониторинг и логирование
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function realtimeBalanceDeductionDiagnostic() {
  console.log('🔍 ДИАГНОСТИКА РЕАЛЬНОГО ВРЕМЕНИ: Списание баланса после пополнения');
  console.log('='.repeat(80));
  console.log(`📅 ${new Date().toLocaleString('ru-RU')}`);
  console.log('⚠️  БЕЗ ИЗМЕНЕНИЙ КОДА - только мониторинг');
  
  // Определяем текущего пользователя из логов (User 184)
  const currentUserId = 184;
  console.log(`👤 Мониторинг User ID: ${currentUserId}`);
  
  // 1. ТЕКУЩЕЕ СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ
  console.log('\n1️⃣ ТЕКУЩЕЕ СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ');
  console.log('-'.repeat(60));
  
  const { data: currentUser, error: userError } = await supabase
    .from('users')
    .select('id, username, balance_ton, balance_uni, created_at')
    .eq('id', currentUserId)
    .single();

  if (userError) {
    console.error('❌ Пользователь не найден:', userError.message);
    return;
  }

  console.log(`👤 User: @${currentUser.username} (ID: ${currentUser.id})`);
  console.log(`💰 Текущий TON баланс: ${currentUser.balance_ton}`);
  console.log(`🪙 Текущий UNI баланс: ${currentUser.balance_uni}`);
  
  // 2. ПОСЛЕДНИЕ ТРАНЗАКЦИИ (за последние 10 минут)
  console.log('\n2️⃣ ПОСЛЕДНИЕ ТРАНЗАКЦИИ (10 минут)');
  console.log('-'.repeat(60));
  
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  
  const { data: recentTransactions, error: txError } = await supabase
    .from('transactions')
    .select('id, type, amount_ton, amount_uni, currency, description, status, created_at, metadata')
    .eq('user_id', currentUserId)
    .gte('created_at', tenMinutesAgo)
    .order('created_at', { ascending: false })
    .limit(20);

  if (txError) {
    console.error('❌ Ошибка получения транзакций:', txError.message);
    return;
  }

  console.log(`📊 Найдено транзакций за 10 минут: ${recentTransactions.length}`);
  
  if (recentTransactions.length > 0) {
    console.log('\n📋 ДЕТАЛИ ПОСЛЕДНИХ ТРАНЗАКЦИЙ:');
    console.log('Время    | ID     | Тип           | TON      | UNI      | Статус | Описание');
    console.log('-'.repeat(85));
    
    recentTransactions.forEach(tx => {
      const time = tx.created_at.split('T')[1].substring(0, 8);
      const tonAmount = tx.amount_ton || '0';
      const uniAmount = tx.amount_uni || '0';
      
      console.log(`${time} | ${String(tx.id).padEnd(6)} | ${String(tx.type).padEnd(13)} | ${String(tonAmount).padEnd(8)} | ${String(uniAmount).padEnd(8)} | ${String(tx.status).padEnd(6)} | ${(tx.description || '').substring(0, 30)}...`);
    });
  }

  // 3. ПОИСК ПАР "ПОПОЛНЕНИЕ + СПИСАНИЕ"
  console.log('\n3️⃣ АНАЛИЗ ПАР "ПОПОЛНЕНИЕ + СПИСАНИЕ"');
  console.log('-'.repeat(60));
  
  // Ищем положительные транзакции
  const creditTransactions = recentTransactions.filter(tx => 
    parseFloat(tx.amount_ton || 0) > 0 || parseFloat(tx.amount_uni || 0) > 0
  );
  
  // Ищем отрицательные транзакции или списания
  const debitTransactions = recentTransactions.filter(tx => {
    const desc = (tx.description || '').toLowerCase();
    const type = (tx.type || '').toLowerCase();
    
    return desc.includes('списание') ||
           desc.includes('subtract') ||
           desc.includes('deduct') ||
           desc.includes('withdraw') ||
           desc.includes('fee') ||
           type.includes('withdrawal') ||
           type.includes('deduction') ||
           type.includes('rollback');
  });
  
  console.log(`➕ Пополнений: ${creditTransactions.length}`);
  console.log(`➖ Списаний: ${debitTransactions.length}`);
  
  if (debitTransactions.length > 0) {
    console.log('\n🚨 НАЙДЕНЫ ОПЕРАЦИИ СПИСАНИЯ:');
    debitTransactions.forEach(tx => {
      console.log(`• ID:${tx.id} | ${tx.created_at.split('T')[1].substring(0, 8)} | ${tx.type}`);
      console.log(`  TON: ${tx.amount_ton} | UNI: ${tx.amount_uni}`);
      console.log(`  Описание: ${tx.description}`);
      console.log(`  Metadata: ${JSON.stringify(tx.metadata || {})}`);
      console.log('  ---');
    });
  }

  // 4. МОНИТОРИНГ ИЗМЕНЕНИЙ БАЛАНСА В РЕАЛЬНОМ ВРЕМЕНИ
  console.log('\n4️⃣ МОНИТОРИНГ ИЗМЕНЕНИЙ БАЛАНСА (30 сек)');
  console.log('-'.repeat(60));
  console.log('⏱️  Начинаю отслеживание изменений баланса...');
  
  let previousBalance = { ton: currentUser.balance_ton, uni: currentUser.balance_uni };
  let changeCount = 0;
  
  const monitoringInterval = setInterval(async () => {
    try {
      const { data: updatedUser } = await supabase
        .from('users')
        .select('balance_ton, balance_uni')
        .eq('id', currentUserId)
        .single();
      
      if (updatedUser) {
        const tonChanged = parseFloat(updatedUser.balance_ton) !== parseFloat(previousBalance.ton);
        const uniChanged = parseFloat(updatedUser.balance_uni) !== parseFloat(previousBalance.uni);
        
        if (tonChanged || uniChanged) {
          changeCount++;
          const now = new Date().toLocaleString('ru-RU');
          const tonDiff = parseFloat(updatedUser.balance_ton) - parseFloat(previousBalance.ton);
          const uniDiff = parseFloat(updatedUser.balance_uni) - parseFloat(previousBalance.uni);
          
          console.log(`\n📈 ИЗМЕНЕНИЕ БАЛАНСА #${changeCount} - ${now}`);
          console.log(`   TON: ${previousBalance.ton} → ${updatedUser.balance_ton} (${tonDiff > 0 ? '+' : ''}${tonDiff.toFixed(6)})`);
          console.log(`   UNI: ${previousBalance.uni} → ${updatedUser.balance_uni} (${uniDiff > 0 ? '+' : ''}${uniDiff.toFixed(6)})`);
          
          // Сразу проверяем новые транзакции
          const { data: newTransactions } = await supabase
            .from('transactions')
            .select('id, type, amount_ton, amount_uni, description, created_at')
            .eq('user_id', currentUserId)
            .gte('created_at', new Date(Date.now() - 60000).toISOString())
            .order('created_at', { ascending: false })
            .limit(5);
          
          if (newTransactions && newTransactions.length > 0) {
            console.log('   📋 Связанные транзакции:');
            newTransactions.forEach(tx => {
              const time = tx.created_at.split('T')[1].substring(0, 8);
              console.log(`      ${time} | ${tx.type} | TON:${tx.amount_ton} UNI:${tx.amount_uni} | ${(tx.description || '').substring(0, 40)}`);
            });
          }
          
          previousBalance = { ton: updatedUser.balance_ton, uni: updatedUser.balance_uni };
        }
      }
    } catch (error) {
      console.error('❌ Ошибка мониторинга:', error.message);
    }
  }, 2000); // Проверяем каждые 2 секунды

  // Останавливаем мониторинг через 30 секунд
  setTimeout(() => {
    clearInterval(monitoringInterval);
    console.log('\n⏹️  Мониторинг завершен');
    console.log(`📊 Зафиксировано изменений баланса: ${changeCount}`);
    
    if (changeCount > 0) {
      console.log('\n🎯 РЕКОМЕНДАЦИИ:');
      console.log('1. Проверить функции BalanceManager.subtractBalance()');
      console.log('2. Найти автоматические процессы списания');
      console.log('3. Проверить логику обработки дубликатов транзакций');
      console.log('4. Изучить WebSocket уведомления и их влияние на баланс');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📋 ДИАГНОСТИКА РЕАЛЬНОГО ВРЕМЕНИ ЗАВЕРШЕНА');
    console.log('='.repeat(80));
  }, 30000);
}

realtimeBalanceDeductionDiagnostic().catch(console.error);