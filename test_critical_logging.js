#!/usr/bin/env node

/**
 * ТЕСТ КРИТИЧНОГО ЛОГИРОВАНИЯ
 * Проверяет работу нашего мониторинга депозитов
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCriticalLogging() {
  console.log('🧪 ТЕСТ КРИТИЧНОГО ЛОГИРОВАНИЯ');
  console.log('='.repeat(50));
  
  try {
    // Проверяем подключение к БД
    const { data: user, error } = await supabase
      .from('users')
      .select('id, balance_ton, balance_uni')
      .eq('id', 184)
      .single();
    
    if (error) {
      console.log('❌ Ошибка подключения к БД:', error.message);
      return;
    }
    
    console.log('✅ Подключение к БД работает');
    console.log(`👤 User 184: TON=${user.balance_ton}, UNI=${user.balance_uni}`);
    
    // Проверяем API сервера
    const response = await fetch('http://localhost:3000/health');
    if (!response.ok) {
      console.log('❌ Сервер недоступен');
      return;
    }
    
    console.log('✅ Сервер отвечает');
    
    // Создаем тестовое изменение баланса для проверки логирования
    const testAmount = 0.001;
    const originalBalance = parseFloat(user.balance_ton || '0');
    const newBalance = originalBalance + testAmount;
    
    console.log(`\n🔧 Тестируем обновление баланса:`);
    console.log(`   ${originalBalance} → ${newBalance} (+${testAmount})`);
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ balance_ton: newBalance })
      .eq('id', 184);
    
    if (updateError) {
      console.log('❌ Ошибка обновления:', updateError.message);
    } else {
      console.log('✅ Баланс обновлен');
      
      // Возвращаем обратно
      setTimeout(async () => {
        await supabase
          .from('users')
          .update({ balance_ton: originalBalance })
          .eq('id', 184);
        console.log('🔄 Баланс восстановлен');
      }, 2000);
    }
    
    // Создаем тестовую транзакцию
    console.log('\n🧪 Тестируем создание транзакции:');
    
    const { data: testTx, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: 184,
        type: 'FARMING_REWARD',
        amount: '0.001',
        amount_uni: '0',
        amount_ton: '0.001',
        currency: 'TON',
        status: 'completed',
        description: 'Test critical logging transaction'
      })
      .select('id')
      .single();
    
    if (txError) {
      console.log('❌ Ошибка создания транзакции:', txError.message);
    } else {
      console.log('✅ Тестовая транзакция создана:', testTx.id);
      
      // Удаляем тестовую транзакцию
      setTimeout(async () => {
        await supabase.from('transactions').delete().eq('id', testTx.id);
        console.log('🗑️ Тестовая транзакция удалена');
      }, 3000);
    }
    
    console.log('\n📋 Проверьте логи сервера на наличие:');
    console.log('   • [CRITICAL] [DIRECT_BALANCE_UPDATE]');
    console.log('   • [CRITICAL] [TON_DEPOSIT_*]');
    console.log('\n💡 Команда: grep -E "\\[CRITICAL\\]" server.log');
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error.message);
  }
}

testCriticalLogging();