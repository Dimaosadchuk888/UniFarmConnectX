#!/usr/bin/env node
/**
 * Тест создания транзакций напрямую в базе для проверки
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function testTransactionCreation() {
  console.log('🧪 Тест создания транзакции напрямую в БД...\n');

  try {
    const testPayload = {
      user_id: 184,
      type: 'FARMING_DEPOSIT',
      amount: '999',
      amount_uni: '999',
      amount_ton: '0',
      currency: 'UNI',
      status: 'completed',
      description: 'TEST: Manual transaction creation test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Создаю тестовую транзакцию:', testPayload);

    const { data, error } = await supabase
      .from('transactions')
      .insert([testPayload])
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка создания тестовой транзакции:', error);
      return;
    }

    console.log('✅ Тестовая транзакция успешно создана!');
    console.log('📊 Данные:', data);

    // Удаляем тестовую транзакцию
    console.log('\n🗑️ Удаляю тестовую транзакцию...');
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', data.id);

    if (deleteError) {
      console.error('❌ Ошибка удаления тестовой транзакции:', deleteError);
    } else {
      console.log('✅ Тестовая транзакция удалена');
    }

  } catch (error) {
    console.error('❌ Исключение при тесте:', error);
  }
}

testTransactionCreation();