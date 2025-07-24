#!/usr/bin/env node

/**
 * ИССЛЕДОВАНИЕ ПРЯМЫХ ОБНОВЛЕНИЙ БД - БЕЗ ИЗМЕНЕНИЙ КОДА
 * Ищет места где баланс обновляется напрямую в БД без транзакций
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateDirectDatabaseUpdates() {
  console.log('🔍 ИССЛЕДОВАНИЕ ПРЯМЫХ ОБНОВЛЕНИЙ БД');
  console.log('='.repeat(80));
  console.log(`📅 ${new Date().toLocaleString('ru-RU')}`);
  console.log('⚠️  БЕЗ ИЗМЕНЕНИЙ КОДА - поиск прямых UPDATE запросов');
  
  const currentUserId = 184;
  
  // 1. МОНИТОРИНГ ИЗМЕНЕНИЙ В РЕАЛЬНОМ ВРЕМЕНИ
  console.log('\n1️⃣ МОНИТОРИНГ ПРЯМЫХ ИЗМЕНЕНИЙ БАЛАНСА (20 сек)');
  console.log('-'.repeat(60));
  
  // Получаем начальный баланс
  const { data: initialBalance } = await supabase
    .from('users')
    .select('balance_ton, balance_uni')
    .eq('id', currentUserId)
    .single();
  
  console.log(`📊 Начальный баланс:`);
  console.log(`   TON: ${initialBalance?.balance_ton || 0}`);
  console.log(`   UNI: ${initialBalance?.balance_uni || 0}`);
  
  let changeCount = 0;
  let previousBalance = { 
    ton: parseFloat(initialBalance?.balance_ton || '0'), 
    uni: parseFloat(initialBalance?.balance_uni || '0')
  };
  
  console.log('\n⏱️  Начинаю отслеживание прямых изменений БД...');
  
  const detectedChanges = [];
  
  const monitoringInterval = setInterval(async () => {
    try {
      // Проверяем баланс
      const { data: currentBalance } = await supabase
        .from('users')
        .select('balance_ton, balance_uni')
        .eq('id', currentUserId)
        .single();
      
      if (currentBalance) {
        const tonCurrent = parseFloat(currentBalance.balance_ton);
        const uniCurrent = parseFloat(currentBalance.balance_uni);
        
        const tonChanged = Math.abs(tonCurrent - previousBalance.ton) > 0.000001;
        const uniChanged = Math.abs(uniCurrent - previousBalance.uni) > 0.000001;
        
        if (tonChanged || uniChanged) {
          changeCount++;
          const now = new Date();
          const timestamp = now.toLocaleString('ru-RU');
          
          const tonDiff = tonCurrent - previousBalance.ton;
          const uniDiff = uniCurrent - previousBalance.uni;
          
          console.log(`\n📈 ИЗМЕНЕНИЕ #${changeCount} - ${timestamp}`);
          console.log(`   TON: ${previousBalance.ton.toFixed(6)} → ${tonCurrent.toFixed(6)} (${tonDiff > 0 ? '+' : ''}${tonDiff.toFixed(6)})`);
          console.log(`   UNI: ${previousBalance.uni.toFixed(6)} → ${uniCurrent.toFixed(6)} (${uniDiff > 0 ? '+' : ''}${uniDiff.toFixed(6)})`);
          
          // Проверяем, есть ли соответствующие транзакции
          const oneMinuteAgo = new Date(now.getTime() - 60000).toISOString();
          
          const { data: recentTransactions } = await supabase
            .from('transactions')
            .select('id, type, amount_ton, amount_uni, description, created_at')
            .eq('user_id', currentUserId)
            .gte('created_at', oneMinuteAgo)
            .order('created_at', { ascending: false });
          
          let foundMatchingTransaction = false;
          
          if (recentTransactions && recentTransactions.length > 0) {
            console.log(`   📋 Найдено транзакций за минуту: ${recentTransactions.length}`);
            
            // Ищем транзакцию, которая объясняет изменение
            for (const tx of recentTransactions) {
              const txTon = parseFloat(tx.amount_ton || '0');
              const txUni = parseFloat(tx.amount_uni || '0');
              
              const isTonMatch = Math.abs(txTon - Math.abs(tonDiff)) < 0.000001;
              const isUniMatch = Math.abs(txUni - Math.abs(uniDiff)) < 0.000001;
              
              if ((tonDiff !== 0 && isTonMatch) || (uniDiff !== 0 && isUniMatch)) {
                console.log(`   ✅ НАЙДЕНА соответствующая транзакция: ID:${tx.id} | ${tx.type}`);
                console.log(`      TON:${tx.amount_ton} UNI:${tx.amount_uni} | ${(tx.description || '').substring(0, 40)}`);
                foundMatchingTransaction = true;
                break;
              }
            }
          }
          
          if (!foundMatchingTransaction) {
            console.log(`   🚨 НЕ НАЙДЕНА транзакция для этого изменения!`);
            console.log(`   ❗ Это ПРЯМОЕ ОБНОВЛЕНИЕ БД без создания транзакции!`);
            
            detectedChanges.push({
              timestamp: now,
              tonChange: tonDiff,
              uniChange: uniDiff,
              hasTransaction: false
            });
          } else {
            detectedChanges.push({
              timestamp: now,
              tonChange: tonDiff,
              uniChange: uniDiff,
              hasTransaction: true
            });
          }
          
          previousBalance = { ton: tonCurrent, uni: uniCurrent };
        }
      }
    } catch (error) {
      console.error('❌ Ошибка мониторинга:', error.message);
    }
  }, 3000); // Проверяем каждые 3 секунды
  
  // Останавливаем через 20 секунд
  setTimeout(async () => {
    clearInterval(monitoringInterval);
    
    console.log('\n2️⃣ АНАЛИЗ РЕЗУЛЬТАТОВ МОНИТОРИНГА');
    console.log('-'.repeat(60));
    console.log(`📊 Зафиксировано изменений баланса: ${changeCount}`);
    
    const directUpdates = detectedChanges.filter(c => !c.hasTransaction);
    const transactionUpdates = detectedChanges.filter(c => c.hasTransaction);
    
    console.log(`✅ Изменений с транзакциями: ${transactionUpdates.length}`);
    console.log(`🚨 Прямых обновлений БД: ${directUpdates.length}`);
    
    if (directUpdates.length > 0) {
      console.log('\n🚨 ДЕТАЛИ ПРЯМЫХ ОБНОВЛЕНИЙ БД (БЕЗ ТРАНЗАКЦИЙ):');
      directUpdates.forEach((change, i) => {
        console.log(`${i + 1}. ${change.timestamp.toLocaleString('ru-RU')}`);
        console.log(`   TON: ${change.tonChange > 0 ? '+' : ''}${change.tonChange.toFixed(6)}`);
        console.log(`   UNI: ${change.uniChange > 0 ? '+' : ''}${change.uniChange.toFixed(6)}`);
      });
      
      console.log('\n💡 ВОЗМОЖНЫЕ ИСТОЧНИКИ ПРЯМЫХ ОБНОВЛЕНИЙ:');
      console.log('1. BalanceManager.updateUserBalance() - прямые UPDATE к users');
      console.log('2. BatchBalanceProcessor.processBulkSubtract() - массовые UPDATE');
      console.log('3. Автоматические процессы коррекции балансов');
      console.log('4. WebSocket уведомления, вызывающие обновления');
      console.log('5. Планировщики (schedulers) обновляющие баланс напрямую');
    }
    
    if (changeCount === 0) {
      console.log('\n📝 За период мониторинга изменений не обнаружено');
      console.log('   Возможно, проблема происходит в другое время');
      console.log('   Рекомендуется запустить мониторинг во время активности пользователя');
    }
    
    // 3. ФИНАЛЬНЫЙ ДИАГНОЗ
    console.log('\n3️⃣ ДИАГНОЗ ПРОБЛЕМЫ СПИСАНИЯ БАЛАНСА');
    console.log('='.repeat(60));
    
    if (directUpdates.length > 0) {
      console.log('✅ ПРОБЛЕМА ОБНАРУЖЕНА:');
      console.log(`   ${directUpdates.length} прямых обновлений БД без создания транзакций`);
      console.log('   Баланс изменяется, но история транзакций не ведется');
      console.log('   Это объясняет расхождения между расчетным и фактическим балансом');
    } else {
      console.log('ℹ️  За период мониторинга прямых обновлений не обнаружено');
      console.log('   Проблема может проявляться периодически или требует более длительного мониторинга');
    }
    
    console.log('\n📋 РЕКОМЕНДАЦИИ:');
    console.log('1. Найти все места в коде с прямыми UPDATE users SET balance_*');
    console.log('2. Проверить BalanceManager на создание транзакций при каждом обновлении');
    console.log('3. Аудит BatchBalanceProcessor на соответствие транзакциям');
    console.log('4. Мониторинг планировщиков farming и boost систем');
    
    console.log('\n' + '='.repeat(80));
    console.log('📋 ИССЛЕДОВАНИЕ ПРЯМЫХ ОБНОВЛЕНИЙ БД ЗАВЕРШЕНО');
    console.log('='.repeat(80));
    
  }, 20000); // 20 секунд мониторинга
}

investigateDirectDatabaseUpdates().catch(console.error);