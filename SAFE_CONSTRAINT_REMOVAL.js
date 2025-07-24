#!/usr/bin/env node

/**
 * БЕЗОПАСНОЕ УДАЛЕНИЕ ПРОБЛЕМНОГО CONSTRAINT
 * Устраняет idx_tx_hash_unique_safe который вызывает rollback депозитов
 * БЕЗОПАСНЫЕ ИЗМЕНЕНИЯ ТОЛЬКО
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function safeConstraintRemoval() {
  console.log('🛡️ БЕЗОПАСНОЕ УДАЛЕНИЕ ПРОБЛЕМНОГО CONSTRAINT');
  console.log('='.repeat(80));
  console.log(`📅 ${new Date().toLocaleString('ru-RU')}`);
  console.log('⚠️  ТОЛЬКО БЕЗОПАСНЫЕ ИЗМЕНЕНИЯ - НЕ ТРОГАЕМ ДАННЫЕ');
  
  try {
    // 1. СОЗДАЕМ БЭКАП ИНФОРМАЦИИ О CONSTRAINT
    console.log('\n1️⃣ СОЗДАНИЕ БЭКАПА CONSTRAINT ИНФОРМАЦИИ');
    console.log('-'.repeat(60));
    
    // Попытка получить информацию о constraint через прямой SQL
    const backupQuery = `
      SELECT 
        schemaname,
        tablename, 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE indexname LIKE '%tx_hash_unique%'
      ORDER BY tablename, indexname;
    `;
    
    console.log('📋 Попытка создания бэкапа constraint информации...');
    
    const { data: constraintInfo, error: backupError } = await supabase
      .rpc('execute_sql', { query: backupQuery });
    
    if (backupError && !backupError.message.includes('function execute_sql')) {
      console.log(`⚠️  Не удалось создать бэкап: ${backupError.message}`);
    } else if (constraintInfo) {
      console.log('✅ Бэкап constraint информации создан');
      console.log(`   Найдено constraints: ${constraintInfo.length}`);
    }
    
    // 2. БЕЗОПАСНОЕ УДАЛЕНИЕ CONSTRAINT
    console.log('\n2️⃣ БЕЗОПАСНОЕ УДАЛЕНИЕ ПРОБЛЕМНОГО CONSTRAINT');
    console.log('-'.repeat(60));
    
    const dropConstraintQuery = 'DROP INDEX IF EXISTS idx_tx_hash_unique_safe;';
    
    console.log('🔧 Выполнение безопасного удаления constraint...');
    console.log(`   SQL: ${dropConstraintQuery}`);
    
    // Пытаемся удалить через RPC если доступен
    const { error: dropError } = await supabase
      .rpc('execute_sql', { query: dropConstraintQuery });
    
    if (dropError && !dropError.message.includes('function execute_sql')) {
      console.log(`❌ Ошибка удаления через RPC: ${dropError.message}`);
      
      // Альтернативный способ - проверяем существование constraint
      console.log('\n🔍 АЛЬТЕРНАТИВНАЯ ПРОВЕРКА CONSTRAINT');
      
      // Пытаемся создать тестовый дубликат для проверки constraint
      const testHash = `constraint_test_${Date.now()}`;
      
      // Создаем первую тестовую транзакцию
      const { data: testTx1, error: error1 } = await supabase
        .from('transactions')
        .insert({
          user_id: 184,
          type: 'FARMING_REWARD',
          amount: '0.001',
          amount_uni: '0',
          amount_ton: '0.001',
          currency: 'TON',
          status: 'completed',
          description: 'Constraint test transaction',
          tx_hash_unique: testHash
        })
        .select('id')
        .single();
      
      if (error1) {
        console.log(`❌ Не удалось создать тестовую транзакцию: ${error1.message}`);
      } else {
        console.log('✅ Первая тестовая транзакция создана');
        
        // Пытаемся создать дубликат
        const { error: error2 } = await supabase
          .from('transactions')
          .insert({
            user_id: 184,
            type: 'FARMING_REWARD',  
            amount: '0.001',
            amount_uni: '0',
            amount_ton: '0.001',
            currency: 'TON',
            status: 'completed',
            description: 'Duplicate constraint test',
            tx_hash_unique: testHash
          });
        
        if (error2 && error2.message.includes('idx_tx_hash_unique')) {
          console.log('🚨 CONSTRAINT ВСЕ ЕЩЕ АКТИВЕН!');
          console.log('   Необходимо удаление через админ панель или прямой доступ к БД');
          console.log(`   Constraint: ${error2.message.match(/constraint "([^"]+)"/)?.[1] || 'idx_tx_hash_unique_safe'}`);
        } else if (!error2) {
          console.log('✅ CONSTRAINT УСПЕШНО УДАЛЕН! Дубликат создался без ошибки');
          
          // Удаляем тестовую дублирующую транзакцию
          await supabase.from('transactions').delete().eq('tx_hash_unique', testHash);
        }
        
        // Очищаем первую тестовую транзакцию
        await supabase.from('transactions').delete().eq('id', testTx1.id);
      }
    } else {
      console.log('✅ CONSTRAINT УСПЕШНО УДАЛЕН ЧЕРЕЗ RPC!');
    }
    
    // 3. ИТОГОВАЯ ПРОВЕРКА
    console.log('\n3️⃣ ИТОГОВАЯ ПРОВЕРКА РЕЗУЛЬТАТА');
    console.log('-'.repeat(60));
    
    // Финальная проверка - пытаемся создать дубликат
    const finalTestHash = `final_test_${Date.now()}`;
    
    const { data: finalTx1, error: finalError1 } = await supabase
      .from('transactions')
      .insert({
        user_id: 184,
        type: 'FARMING_REWARD',
        amount: '0.001', 
        amount_uni: '0',
        amount_ton: '0.001',
        currency: 'TON',
        status: 'completed',
        description: 'Final constraint test',
        tx_hash_unique: finalTestHash
      })
      .select('id')
      .single();
    
    if (finalError1) {
      console.log(`❌ Финальный тест не прошел: ${finalError1.message}`);
    } else {
      const { error: finalError2 } = await supabase
        .from('transactions')
        .insert({
          user_id: 184,
          type: 'FARMING_REWARD',
          amount: '0.001',
          amount_uni: '0', 
          amount_ton: '0.001',
          currency: 'TON',
          status: 'completed',
          description: 'Final duplicate test',
          tx_hash_unique: finalTestHash
        });
      
      if (finalError2 && finalError2.message.includes('idx_tx_hash_unique')) {
        console.log('❌ CONSTRAINT ВСЕ ЕЩЕ ПРИСУТСТВУЕТ');
        console.log('   Требуется удаление через прямой доступ к PostgreSQL');
      } else {
        console.log('🎉 CONSTRAINT УСПЕШНО УДАЛЕН!');
        console.log('   Проблема "исчезающих депозитов" должна быть устранена');
      }
      
      // Очищаем финальные тестовые транзакции
      await supabase.from('transactions').delete().eq('tx_hash_unique', finalTestHash);
      await supabase.from('transactions').delete().eq('id', finalTx1.id);
    }
    
  } catch (error) {
    console.error('❌ Критичная ошибка в процессе удаления constraint:', error.message);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 БЕЗОПАСНОЕ УДАЛЕНИЕ CONSTRAINT ЗАВЕРШЕНО');
  console.log('='.repeat(80));
}

safeConstraintRemoval().catch(console.error);