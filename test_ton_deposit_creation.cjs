#!/usr/bin/env node
/**
 * ТЕСТ СОЗДАНИЯ TON_DEPOSIT ТРАНЗАКЦИЙ
 * Проверка работы после добавления в enum
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function testTonDepositCreation() {
  console.log('🧪 ТЕСТ СОЗДАНИЯ TON_DEPOSIT ТРАНЗАКЦИЙ');
  
  try {
    // Ищем реального пользователя для теста
    const { data: realUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();

    if (userError || !realUser) {
      console.error('❌ Не найден реальный пользователь для теста');
      return;
    }

    console.log(`✅ Используем пользователя ID: ${realUser.id} для теста`);

    // Пытаемся создать TON_DEPOSIT транзакцию
    const testTransaction = {
      user_id: realUser.id,
      type: 'TON_DEPOSIT',
      amount: '0.001',
      currency: 'TON',
      status: 'completed',
      description: 'TEST: TON deposit after schema fix'
    };

    console.log('🔄 Попытка создания TON_DEPOSIT транзакции...');
    
    const { data: result, error } = await supabase
      .from('transactions')
      .insert([testTransaction])
      .select();

    if (error) {
      console.error('❌ ТЕСТ НЕУДАЧЕН:', error.message);
      console.log('💡 Возможные причины:');
      console.log('   1. Schema миграция еще не применилась');
      console.log('   2. Enum в БД еще не обновлен');
      console.log('   3. Нужен перезапуск сервера');
    } else {
      console.log('✅ УСПЕХ! TON_DEPOSIT транзакция создана:', result[0]);
      
      // Удаляем тестовую транзакцию
      await supabase
        .from('transactions')
        .delete()
        .eq('id', result[0].id);
      
      console.log('🧹 Тестовая транзакция удалена');
      console.log('🎉 TON_DEPOSIT теперь работает корректно!');
    }

  } catch (error) {
    console.error('❌ Критическая ошибка теста:', error);
  }
}

// Альтернативное решение - использовать DEPOSIT + currency='TON'
async function testAlternativeSolution() {
  console.log('\n💡 ТЕСТ АЛЬТЕРНАТИВНОГО РЕШЕНИЯ: DEPOSIT + currency=TON');
  
  try {
    const { data: realUser } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();

    const testTransaction = {
      user_id: realUser.id,
      type: 'DEPOSIT',
      amount: '0.001',
      currency: 'TON',
      status: 'completed',
      description: 'TON deposit from blockchain'
    };

    const { data: result, error } = await supabase
      .from('transactions')
      .insert([testTransaction])
      .select();

    if (error) {
      console.error('❌ Альтернативный тест неудачен:', error.message);
    } else {
      console.log('✅ АЛЬТЕРНАТИВА РАБОТАЕТ! DEPOSIT + TON создана:', result[0]);
      
      // Удаляем тестовую транзакцию
      await supabase
        .from('transactions')
        .delete()
        .eq('id', result[0].id);
      
      console.log('💡 Можем использовать type="DEPOSIT" + currency="TON" временно');
    }

  } catch (error) {
    console.error('❌ Ошибка альтернативного теста:', error);
  }

  console.log('\n🎯 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
}

testTonDepositCreation()
  .then(() => testAlternativeSolution());