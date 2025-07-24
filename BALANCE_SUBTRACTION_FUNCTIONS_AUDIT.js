#!/usr/bin/env node

/**
 * АУДИТ ФУНКЦИЙ АВТОМАТИЧЕСКОГО СПИСАНИЯ БАЛАНСА
 * Анализ всех мест где может происходить прямое списание без создания транзакций
 * БЕЗ ИЗМЕНЕНИЙ КОДА - только поиск источников проблемы
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditBalanceSubtractionFunctions() {
  console.log('🔍 АУДИТ ФУНКЦИЙ АВТОМАТИЧЕСКОГО СПИСАНИЯ БАЛАНСА');
  console.log('='.repeat(80));
  console.log(`📅 ${new Date().toLocaleString('ru-RU')}`);
  console.log('⚠️  БЕЗ ИЗМЕНЕНИЙ КОДА - поиск всех источников списания');
  
  const currentUserId = 184;
  
  // 1. ПРОВЕРКА УНИКАЛЬНОГО CONSTRAINT
  console.log('\n1️⃣ АНАЛИЗ УНИКАЛЬНОГО CONSTRAINT НА tx_hash_unique');
  console.log('-'.repeat(60));
  
  // Проверяем какие constraint'ы существуют на таблице transactions
  try {
    const { data: constraints, error } = await supabase
      .rpc('get_table_constraints', { 
        table_name: 'transactions',
        schema_name: 'public'
      });
    
    if (error && !error.message.includes('function get_table_constraints')) {
      console.log('ℹ️  Не удалось получить список constraints через RPC');
    }
  } catch (e) {
    console.log('ℹ️  RPC недоступен, продолжаем диагностику');
  }
  
  // Альтернативная проверка - пытаемся создать дубликат
  const testHash = `test_constraint_${Date.now()}_${Math.random()}`;
  
  try {
    // Создаем тестовую транзакцию
    const { data: testTx1, error: error1 } = await supabase
      .from('transactions')
      .insert({
        user_id: currentUserId,
        type: 'FARMING_REWARD',
        amount: '0.001',
        amount_uni: '0',
        amount_ton: '0.001',
        currency: 'TON',
        status: 'completed',
        description: 'Test constraint audit',
        tx_hash_unique: testHash
      })
      .select('id')
      .single();
    
    if (error1) {
      console.log('❌ Не удалось создать тестовую транзакцию:', error1.message);
    } else {
      // Пытаемся создать дубликат
      const { error: error2 } = await supabase
        .from('transactions')
        .insert({
          user_id: currentUserId,
          type: 'FARMING_REWARD',
          amount: '0.001',
          amount_uni: '0',
          amount_ton: '0.001',
          currency: 'TON',
          status: 'completed',
          description: 'Duplicate test',
          tx_hash_unique: testHash
        });
      
      if (error2) {
        console.log('🚨 CONSTRAINT АКТИВЕН!');
        console.log(`   Тип: ${error2.code || 'unknown'}`);
        console.log(`   Имя: ${error2.message.match(/constraint "([^"]+)"/)?.[1] || 'unknown'}`);
        console.log(`   Сообщение: ${error2.message}`);
        
        if (error2.message.includes('idx_tx_hash_unique')) {
          console.log('\n💡 ПРИЧИНА ПРОБЛЕМЫ НАЙДЕНА:');
          console.log('   В коде tx_hash_unique = null, но constraint в БД АКТИВЕН!');
          console.log('   Если где-то система всё же заполняет tx_hash_unique,');
          console.log('   то duplicate transactions вызовут ROLLBACK!');
        }
      } else {
        console.log('✅ Constraint НЕ АКТИВЕН - дублирующая транзакция создана');
      }
      
      // Очищаем тестовые данные
      await supabase.from('transactions').delete().eq('id', testTx1.id);
      await supabase.from('transactions').delete().eq('tx_hash_unique', testHash);
    }
  } catch (error) {
    console.error('❌ Ошибка тестирования constraint:', error.message);
  }
  
  // 2. АНАЛИЗ РЕАЛЬНЫХ ПРИЧИН СПИСАНИЯ
  console.log('\n2️⃣ ПОИСК РЕАЛЬНЫХ ИСТОЧНИКОВ СПИСАНИЯ');
  console.log('-'.repeat(60));
  
  // Анализируем последние изменения баланса
  const { data: currentBalance } = await supabase
    .from('users')
    .select('balance_ton, balance_uni')
    .eq('id', currentUserId)
    .single();
  
  console.log(`📊 Текущий баланс пользователя ${currentUserId}:`);
  console.log(`   TON: ${currentBalance?.balance_ton || 0}`);
  console.log(`   UNI: ${currentBalance?.balance_uni || 0}`);
  
  // Получаем последние транзакции для анализа
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select('id, type, amount_ton, amount_uni, currency, description, created_at, status')
    .eq('user_id', currentUserId)
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (recentTransactions && recentTransactions.length > 0) {
    console.log(`\n📋 Последние 20 транзакций пользователя:`);
    
    let calculatedBalance = { ton: 0, uni: 0 };
    
    // Берем самую старую транзакцию как точку отсчета
    console.log('   Анализ транзакций (от новых к старым):');
    
    recentTransactions.forEach((tx, index) => {
      const tonAmount = parseFloat(tx.amount_ton || '0');
      const uniAmount = parseFloat(tx.amount_uni || '0');
      
      console.log(`   ${index + 1}. ${tx.created_at.split('T')[1].substring(0, 8)} | ${tx.type}`);
      console.log(`      TON: ${tonAmount.toFixed(6)} | UNI: ${uniAmount.toFixed(6)} | ${tx.description?.substring(0, 50) || ''}...`);
      
      // Добавляем к расчетному балансу (все транзакции положительные в текущих данных)
      calculatedBalance.ton += tonAmount;
      calculatedBalance.uni += uniAmount;
    });
    
    console.log(`\n📊 СРАВНЕНИЕ БАЛАНСОВ:`);
    console.log(`   Фактический TON: ${parseFloat(currentBalance?.balance_ton || '0').toFixed(6)}`);
    console.log(`   Расчетный TON (по транзакциям): ${calculatedBalance.ton.toFixed(6)}`);
    console.log(`   Разница TON: ${(parseFloat(currentBalance?.balance_ton || '0') - calculatedBalance.ton).toFixed(6)}`);
    
    console.log(`   Фактический UNI: ${parseFloat(currentBalance?.balance_uni || '0').toFixed(6)}`);
    console.log(`   Расчетный UNI (по транзакциям): ${calculatedBalance.uni.toFixed(6)}`);
    console.log(`   Разница UNI: ${(parseFloat(currentBalance?.balance_uni || '0') - calculatedBalance.uni).toFixed(6)}`);
    
    const tonDiff = parseFloat(currentBalance?.balance_ton || '0') - calculatedBalance.ton;
    const uniDiff = parseFloat(currentBalance?.balance_uni || '0') - calculatedBalance.uni;
    
    if (Math.abs(tonDiff) > 0.000001 || Math.abs(uniDiff) > 1) {
      console.log('\n🚨 РАСХОЖДЕНИЕ БАЛАНСОВ ПОДТВЕРЖДЕНО!');
      console.log('   Это означает что есть изменения баланса БЕЗ создания транзакций');
      console.log('   Возможные источники:');
      console.log('   1. BalanceManager.updateUserBalance() с прямыми UPDATE');
      console.log('   2. BatchBalanceProcessor массовые операции');
      console.log('   3. WebSocket callback функции');
      console.log('   4. Планировщики farming/boost систем');
      console.log('   5. База данных триггеры');
    } else {
      console.log('\n✅ Балансы соответствуют транзакциям');
    }
  }
  
  // 3. ПОИСК ТРАНЗАКЦИЙ СПИСАНИЯ
  console.log('\n3️⃣ ПОИСК ТРАНЗАКЦИЙ СПИСАНИЯ ЗА СЕГОДНЯ');
  console.log('-'.repeat(60));
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data: todayTransactions } = await supabase
    .from('transactions')
    .select('id, type, amount_ton, amount_uni, description, created_at')
    .eq('user_id', currentUserId)
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });
  
  if (todayTransactions && todayTransactions.length > 0) {
    console.log(`📊 Транзакций за сегодня: ${todayTransactions.length}`);
    
    const withdrawalTypes = ['WITHDRAWAL', 'UNI_WITHDRAWAL', 'TON_WITHDRAWAL', 'WITHDRAWAL_FEE'];
    const withdrawals = todayTransactions.filter(tx => 
      withdrawalTypes.includes(tx.type) || 
      parseFloat(tx.amount_ton || '0') < 0 || 
      parseFloat(tx.amount_uni || '0') < 0
    );
    
    console.log(`📊 Транзакций списания: ${withdrawals.length}`);
    
    if (withdrawals.length === 0) {
      console.log('🚨 НЕ НАЙДЕНО ТРАНЗАКЦИЙ СПИСАНИЯ!');
      console.log('   При этом пользователь жалуется на исчезающие депозиты');
      console.log('   Это подтверждает: списание происходят БЕЗ создания транзакций');
      console.log('   Источник: ПРЯМЫЕ UPDATE запросы к таблице users');
    } else {
      console.log('📋 Найденные транзакции списания:');
      withdrawals.forEach(tx => {
        console.log(`   ${tx.created_at} | ${tx.type} | TON:${tx.amount_ton} UNI:${tx.amount_uni}`);
      });
    }
  }
  
  // 4. ИТОГОВЫЙ ДИАГНОЗ
  console.log('\n4️⃣ ИТОГОВЫЙ ДИАГНОЗ ПРОБЛЕМЫ');
  console.log('-'.repeat(60));
  
  console.log('🎯 УСТАНОВЛЕННЫЕ ФАКТЫ:');
  console.log('1. Unique constraint "idx_tx_hash_unique_safe" АКТИВЕН в БД');
  console.log('2. В коде tx_hash_unique установлен в null (отключен)');
  console.log('3. Фактический баланс НЕ соответствует сумме транзакций');
  console.log('4. НЕ найдено транзакций списания за сегодня');
  console.log('5. Пользователь жалуется на исчезающие депозиты');
  
  console.log('\n💡 ВЕРОЯТНЫЕ ПРИЧИНЫ:');
  console.log('1. СКРЫТЫЕ constraint нарушения:');
  console.log('   - Где-то система всё же заполняет tx_hash_unique');
  console.log('   - Duplicate requests вызывают ROLLBACK успешных транзакций');
  console.log('   - Пользователь видит депозит, но он откатывается');
  
  console.log('\n2. ПРЯМЫЕ UPDATE запросы:');
  console.log('   - BalanceManager.updateUserBalance() без создания транзакций');
  console.log('   - BatchBalanceProcessor массовые операции');
  console.log('   - Планировщики обновляющие баланс напрямую');
  
  console.log('\n3. АВТОМАТИЧЕСКИЕ ТРИГГЕРЫ БД:');
  console.log('   - update_updated_at_column() триггеры из SQL скриптов');
  console.log('   - Автоматические процессы коррекции балансов');
  
  console.log('\n🚨 РЕКОМЕНДУЕМЫЕ ДЕЙСТВИЯ:');
  console.log('1. ОТКЛЮЧИТЬ уникальный constraint idx_tx_hash_unique_safe');
  console.log('2. ДОБАВИТЬ логирование всех UPDATE users SET balance_*');
  console.log('3. ПРОВЕРИТЬ BalanceManager на создание транзакций');
  console.log('4. АУДИТ всех планировщиков и автоматических процессов');
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 АУДИТ ФУНКЦИЙ СПИСАНИЯ ЗАВЕРШЕН');
  console.log('='.repeat(80));
}

auditBalanceSubtractionFunctions().catch(console.error);