#!/usr/bin/env node
/**
 * ДИАГНОСТИКА СХЕМЫ БД - Supabase vs PostgreSQL enum
 * Выяснение правильной схемы для transaction_type
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function investigateSchema() {
  console.log('🔍 ДИАГНОСТИКА СХЕМЫ БД - TRANSACTION_TYPE');
  
  try {
    // 1. Проверяем таблицу transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('id, type, currency')
      .limit(5);
    
    if (error) {
      console.error('❌ Ошибка получения transactions:', error);
      return;
    }
    
    console.log(`✅ Найдено ${transactions.length} транзакций`);
    
    // 2. Анализируем существующие типы
    const uniqueTypes = [...new Set(transactions.map(t => t.type))];
    console.log('\n📊 СУЩЕСТВУЮЩИЕ ТИПЫ В БД:');
    uniqueTypes.forEach(type => {
      const count = transactions.filter(t => t.type === type).length;
      console.log(`   ${type}: ${count} шт.`);
    });
    
    // 3. Проверяем есть ли TON_DEPOSIT
    const tonDeposits = transactions.filter(t => t.type === 'TON_DEPOSIT');
    console.log(`\n💎 TON_DEPOSIT транзакций: ${tonDeposits.length}`);
    
    if (tonDeposits.length === 0) {
      console.log('🚨 ПРОБЛЕМА ПОДТВЕРЖДЕНА: TON_DEPOSIT не работает');
      
      // 4. Попробуем создать тестовую транзакцию с TON_DEPOSIT
      console.log('\n🧪 ТЕСТ: Попытка создать TON_DEPOSIT транзакцию...');
      
      const testTransaction = {
        user_id: 999999, // Тестовый ID
        type: 'TON_DEPOSIT',
        amount: '0.001',
        currency: 'TON',
        status: 'completed',
        description: 'TEST: Database schema test'
      };
      
      const { data: testResult, error: testError } = await supabase
        .from('transactions')
        .insert([testTransaction])
        .select();
      
      if (testError) {
        console.log('❌ ТЕСТ НЕУДАЧЕН:', testError.message);
        console.log('📋 Это подтверждает проблему с enum schema');
        
        // Проверяем детали ошибки
        if (testError.message.includes('invalid input value for enum')) {
          console.log('✅ ДИАГНОЗ: PostgreSQL enum не содержит TON_DEPOSIT');
          console.log('💡 РЕШЕНИЕ: Нужно добавить в enum или использовать другой подход');
        }
      } else {
        console.log('✅ ТЕСТ ПРОШЕЛ:', testResult);
        console.log('🤔 Неожиданно - TON_DEPOSIT работает');
        
        // Удаляем тестовую запись
        await supabase.from('transactions').delete().eq('user_id', 999999);
      }
    }
    
    // 5. Альтернативное решение - проверяем DEPOSIT тип
    const regularDeposits = transactions.filter(t => t.type === 'DEPOSIT');
    console.log(`\n📥 DEPOSIT транзакций: ${regularDeposits.length}`);
    
    if (regularDeposits.length > 0) {
      console.log('💡 АЛЬТЕРНАТИВА: Можем использовать type="DEPOSIT" + currency="TON"');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка диагностики:', error);
  }
  
  console.log('\n🎯 ДИАГНОСТИКА СХЕМЫ ЗАВЕРШЕНА');
}

investigateSchema();