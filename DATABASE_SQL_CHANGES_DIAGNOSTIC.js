#!/usr/bin/env node

/**
 * ДИАГНОСТИКА SQL ИЗМЕНЕНИЙ И ПОДКЛЮЧЕНИЙ БД
 * Проверяет недавние изменения в БД которые могут вызывать автоматическое списание
 * БЕЗ ИЗМЕНЕНИЙ КОДА - только анализ
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseDatabaseSQLChanges() {
  console.log('🔍 ДИАГНОСТИКА SQL ИЗМЕНЕНИЙ И ПОДКЛЮЧЕНИЙ БД');
  console.log('='.repeat(80));
  console.log(`📅 ${new Date().toLocaleString('ru-RU')}`);
  console.log('⚠️  БЕЗ ИЗМЕНЕНИЙ КОДА - поиск SQL триггеров и изменений');
  
  const currentUserId = 184;
  
  // 1. ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦЫ users
  console.log('\n1️⃣ ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦЫ users');
  console.log('-'.repeat(60));
  
  try {
    // Проверяем поля таблицы users
    const { data: userSchema, error: schemaError } = await supabase
      .rpc('get_table_schema', { table_name: 'users' })
      .single();
    
    if (schemaError && !schemaError.message.includes('function get_table_schema')) {
      console.error('❌ Ошибка получения схемы:', schemaError.message);
    }
    
    // Альтернативный способ - просто получить пример записи
    const { data: sampleUser, error: sampleError } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentUserId)
      .single();
    
    if (sampleError) {
      console.error('❌ Ошибка получения примера пользователя:', sampleError.message);
    } else {
      console.log('📊 Поля таблицы users:');
      Object.keys(sampleUser).forEach(field => {
        const value = sampleUser[field];
        const type = typeof value;
        console.log(`   ${field}: ${type} = ${value}`);
      });
    }
  } catch (error) {
    console.error('❌ Ошибка анализа схемы:', error.message);
  }

  // 2. ПРОВЕРКА НАЛИЧИЯ TRIGGERS
  console.log('\n2️⃣ ПОИСК ТРИГГЕРОВ НА ТАБЛИЦЕ users');
  console.log('-'.repeat(60));
  
  try {
    // Пытаемся найти информацию о триггерах через информационную схему
    const { data: triggers, error: triggersError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_manipulation, action_timing, action_statement')
      .eq('event_object_table', 'users');
    
    if (triggersError) {
      console.log('ℹ️  Не удалось получить информацию о триггерах (возможно, нет доступа)');
      console.log('   Ошибка:', triggersError.message);
    } else if (triggers && triggers.length > 0) {
      console.log(`🚨 НАЙДЕНО ТРИГГЕРОВ: ${triggers.length}`);
      triggers.forEach(trigger => {
        console.log(`• Триггер: ${trigger.trigger_name}`);
        console.log(`  События: ${trigger.event_manipulation}`);
        console.log(`  Время: ${trigger.action_timing}`);
        console.log(`  Действие: ${trigger.action_statement.substring(0, 100)}...`);
        console.log('  ---');
      });
    } else {
      console.log('✅ Триггеры на таблице users не найдены');
    }
  } catch (error) {
    console.log('ℹ️  Информация о триггерах недоступна:', error.message);
  }

  // 3. АНАЛИЗ НЕДАВНИХ ИЗМЕНЕНИЙ В transactions
  console.log('\n3️⃣ АНАЛИЗ СТРУКТУРЫ ТАБЛИЦЫ transactions');
  console.log('-'.repeat(60));
  
  const { data: sampleTransaction, error: txSampleError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', currentUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (txSampleError) {
    console.error('❌ Ошибка получения примера транзакции:', txSampleError.message);
  } else {
    console.log('📊 Поля таблицы transactions:');
    Object.keys(sampleTransaction).forEach(field => {
      const value = sampleTransaction[field];
      const type = typeof value;
      console.log(`   ${field}: ${type} = ${JSON.stringify(value).substring(0, 50)}...`);
    });
    
    // Проверяем специально tx_hash_unique и связанные поля
    console.log('\n🔍 СПЕЦИАЛЬНЫЕ ПОЛЯ:');
    console.log(`   tx_hash_unique: ${sampleTransaction.tx_hash_unique}`);
    console.log(`   is_duplicate: ${sampleTransaction.is_duplicate}`);
    console.log(`   duplicate_of_id: ${sampleTransaction.duplicate_of_id}`);
  }

  // 4. ПРОВЕРКА CONSTRAINT'ов И ИНДЕКСОВ
  console.log('\n4️⃣ ПОИСК UNIQUE CONSTRAINT НА tx_hash_unique');
  console.log('-'.repeat(60));
  
  try {
    // Пытаемся создать дублирующий tx_hash_unique для проверки constraint
    const testHash = `test_hash_${Date.now()}`;
    
    // Создаем первую транзакцию
    const { data: firstTx, error: firstError } = await supabase
      .from('transactions')
      .insert({
        user_id: currentUserId,
        type: 'FARMING_REWARD',
        amount: '0.001',
        amount_uni: '0',
        amount_ton: '0.001',
        currency: 'TON',
        status: 'completed',
        description: 'Test transaction for constraint check',
        tx_hash_unique: testHash
      })
      .select()
      .single();
    
    if (firstError) {
      console.log('ℹ️  Не удалось создать тестовую транзакцию:', firstError.message);
    } else {
      console.log('✅ Первая тестовая транзакция создана');
      
      // Пытаемся создать дублирующую
      const { data: secondTx, error: secondError } = await supabase
        .from('transactions')
        .insert({
          user_id: currentUserId,
          type: 'FARMING_REWARD',
          amount: '0.001',
          amount_uni: '0',
          amount_ton: '0.001',
          currency: 'TON',
          status: 'completed',
          description: 'Duplicate test transaction',
          tx_hash_unique: testHash
        })
        .select()
        .single();
      
      if (secondError && secondError.message.includes('duplicate')) {
        console.log('🚨 CONSTRAINT АКТИВЕН! Обнаружен unique constraint на tx_hash_unique');
        console.log('   Ошибка:', secondError.message);
      } else if (secondError) {
        console.log('ℹ️  Другая ошибка при создании дубликата:', secondError.message);
      } else {
        console.log('⚠️  Дубликат создан успешно - constraint НЕ АКТИВЕН');
        
        // Удаляем второй тест
        await supabase.from('transactions').delete().eq('id', secondTx.id);
      }
      
      // Удаляем первый тест
      await supabase.from('transactions').delete().eq('id', firstTx.id);
      console.log('🧹 Тестовые транзакции удалены');
    }
  } catch (error) {
    console.error('❌ Ошибка проверки constraint:', error.message);
  }

  // 5. МОНИТОРИНГ РЕАЛЬНОГО ВРЕМЕНИ СПИСАНИЯ
  console.log('\n5️⃣ РЕАЛЬНЫЙ МОНИТОРИНГ СПИСАНИЯ TON (15 сек)');
  console.log('-'.repeat(60));
  
  // Получаем начальный баланс
  const { data: initialUser } = await supabase
    .from('users')
    .select('balance_ton, balance_uni')
    .eq('id', currentUserId)
    .single();
  
  console.log(`📊 Начальный баланс: TON=${initialUser?.balance_ton}, UNI=${initialUser?.balance_uni}`);
  
  let detectedDeductions = [];
  let previousTon = parseFloat(initialUser?.balance_ton || '0');
  let previousUni = parseFloat(initialUser?.balance_uni || '0');
  
  console.log('⏱️  Отслеживаю автоматические списания...');
  
  const monitorInterval = setInterval(async () => {
    try {
      const { data: currentUser } = await supabase
        .from('users')
        .select('balance_ton, balance_uni')
        .eq('id', currentUserId)
        .single();
      
      if (currentUser) {
        const currentTon = parseFloat(currentUser.balance_ton);
        const currentUni = parseFloat(currentUser.balance_uni);
        
        const tonDiff = currentTon - previousTon;
        const uniDiff = currentUni - previousUni;
        
        // Фиксируем ТОЛЬКО списания (отрицательные изменения)
        if (tonDiff < -0.000001 || uniDiff < -1) {
          const now = new Date();
          console.log(`\n💸 СПИСАНИЕ ОБНАРУЖЕНО - ${now.toLocaleString('ru-RU')}`);
          console.log(`   TON: ${previousTon.toFixed(6)} → ${currentTon.toFixed(6)} (${tonDiff.toFixed(6)})`);
          console.log(`   UNI: ${previousUni.toFixed(6)} → ${currentUni.toFixed(6)} (${uniDiff.toFixed(6)})`);
          
          // Ищем соответствующие транзакции списания
          const { data: recentTx } = await supabase
            .from('transactions')
            .select('id, type, amount_ton, amount_uni, description, created_at')
            .eq('user_id', currentUserId)
            .gte('created_at', new Date(now.getTime() - 30000).toISOString())
            .order('created_at', { ascending: false });
          
          let foundExplanation = false;
          if (recentTx && recentTx.length > 0) {
            console.log(`   📋 Недавние транзакции (${recentTx.length}):`);
            recentTx.forEach(tx => {
              const txTon = parseFloat(tx.amount_ton || '0');
              const txUni = parseFloat(tx.amount_uni || '0');
              console.log(`      ${tx.created_at.split('T')[1].substring(0, 8)} | ${tx.type} | TON:${txTon} UNI:${txUni}`);
              
              // Проверяем, объясняет ли транзакция списание
              if (Math.abs(txTon + tonDiff) < 0.000001 || Math.abs(txUni + uniDiff) < 1) {
                foundExplanation = true;
              }
            });
          }
          
          if (!foundExplanation) {
            console.log(`   🚨 НЕТ ОБЪЯСНЯЮЩЕЙ ТРАНЗАКЦИИ - это ПРЯМОЕ UPDATE БД!`);
          }
          
          detectedDeductions.push({
            timestamp: now,
            tonDeduction: -tonDiff,
            uniDeduction: -uniDiff,
            hasExplanation: foundExplanation
          });
        }
        
        previousTon = currentTon;
        previousUni = currentUni;
      }
    } catch (error) {
      console.error('❌ Ошибка мониторинга:', error.message);
    }
  }, 2000);
  
  setTimeout(() => {
    clearInterval(monitorInterval);
    
    console.log('\n6️⃣ РЕЗУЛЬТАТЫ МОНИТОРИНГА');
    console.log('-'.repeat(60));
    console.log(`📊 Обнаружено списаний: ${detectedDeductions.length}`);
    
    if (detectedDeductions.length > 0) {
      const unexplainedDeductions = detectedDeductions.filter(d => !d.hasExplanation);
      console.log(`🚨 Необъяснимых списаний: ${unexplainedDeductions.length}`);
      
      console.log('\n📋 ДЕТАЛИ ВСЕХ СПИСАНИЙ:');
      detectedDeductions.forEach((deduction, i) => {
        console.log(`${i + 1}. ${deduction.timestamp.toLocaleString('ru-RU')}`);
        console.log(`   TON списано: ${deduction.tonDeduction.toFixed(6)}`);
        console.log(`   UNI списано: ${deduction.uniDeduction.toFixed(6)}`);
        console.log(`   Есть объяснение: ${deduction.hasExplanation ? 'ДА' : 'НЕТ'}`);
      });
      
      if (unexplainedDeductions.length > 0) {
        console.log('\n🎯 ДИАГНОЗ:');
        console.log('   Система ДЕЙСТВИТЕЛЬНО списывает средства без создания транзакций');
        console.log('   Это ПРЯМЫЕ UPDATE запросы к таблице users');
        console.log('   Источник: BalanceManager или автоматические процессы');
      }
    } else {
      console.log('ℹ️  За период мониторинга списаний не обнаружено');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📋 ДИАГНОСТИКА SQL ИЗМЕНЕНИЙ ЗАВЕРШЕНА');
    console.log('='.repeat(80));
  }, 15000);
}

diagnoseDatabaseSQLChanges().catch(console.error);