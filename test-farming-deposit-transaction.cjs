#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки создания транзакций при депозитах фарминга
 */

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testFarmingDepositTransaction() {
  console.log('\n=== ТЕСТ СОЗДАНИЯ ТРАНЗАКЦИЙ ПРИ ДЕПОЗИТЕ ФАРМИНГА ===\n');
  
  const userId = 74;
  const depositAmount = 123.456; // Уникальная сумма для отслеживания
  
  console.log('1. Текущий баланс и транзакции ДО теста:');
  
  // Проверяем текущий баланс
  const { data: userBefore } = await supabase
    .from('users')
    .select('balance_uni, uni_deposit_amount')
    .eq('id', userId)
    .single();
    
  console.log('   Баланс UNI:', userBefore.balance_uni);
  console.log('   Депозит фарминга:', userBefore.uni_deposit_amount);
  
  // Проверяем количество транзакций FARMING_DEPOSIT
  const { data: txBefore, count: countBefore } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('type', 'FARMING_DEPOSIT');
    
  console.log('   Транзакций FARMING_DEPOSIT:', countBefore || 0);
  
  console.log('\n2. Выполняем депозит через API...');
  
  // Выполняем депозит через API
  const response = await fetch('http://localhost:3000/api/v2/uni-farming/deposit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjc0LCJ1c2VybmFtZSI6InRlc3RfdXNlcl8xNzUyMTI5ODQwOTA1IiwicmVmQ29kZSI6IlJFRl8xNzUyMTI5ODQwOTA2X2h2dnk0aiIsInRlbGVncmFtSWQiOiI5OTk0ODkiLCJmaXJzdE5hbWUiOiJ0ZXN0X3VzZXJfMTc1MjEyOTg0MDkwNSIsImxhc3ROYW1lIjoiIiwiaXNBZG1pbiI6dHJ1ZSwiaWF0IjoxNzUyMjA0NjgyLCJleHAiOjE3NTI4MDk0ODIsImlzcyI6InVuaWZhcm0tand0In0.Qjcg48ABpqOKBUC-Xg5a2Xg69lxtWCqGxOXHj0SU8BE'
    },
    body: JSON.stringify({ amount: depositAmount.toString() })
  });
  
  const result = await response.json();
  console.log('   Результат API:', result);
  
  // Ждем немного для завершения транзакции
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n3. Проверяем результаты ПОСЛЕ депозита:');
  
  // Проверяем новый баланс
  const { data: userAfter } = await supabase
    .from('users')
    .select('balance_uni, uni_deposit_amount')
    .eq('id', userId)
    .single();
    
  console.log('   Баланс UNI:', userAfter.balance_uni);
  console.log('   Депозит фарминга:', userAfter.uni_deposit_amount);
  console.log('   Изменение баланса:', userAfter.balance_uni - userBefore.balance_uni);
  console.log('   Изменение депозита:', userAfter.uni_deposit_amount - userBefore.uni_deposit_amount);
  
  // Проверяем новые транзакции
  const { data: txAfter, count: countAfter } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('type', 'FARMING_DEPOSIT')
    .order('created_at', { ascending: false });
    
  console.log('   Транзакций FARMING_DEPOSIT:', countAfter || 0);
  console.log('   Новых транзакций создано:', (countAfter || 0) - (countBefore || 0));
  
  if (countAfter > countBefore) {
    console.log('\n✅ УСПЕХ! Транзакция создана:');
    const newTx = txAfter[0];
    console.log('   ID:', newTx.id);
    console.log('   Amount:', newTx.amount);
    console.log('   Amount UNI:', newTx.amount_uni);
    console.log('   Currency:', newTx.currency);
    console.log('   Description:', newTx.description);
  } else {
    console.log('\n❌ ПРОБЛЕМА! Транзакция НЕ создана!');
    
    // Проверяем логи сервера
    console.log('\n4. Проверяем последние транзакции всех типов:');
    const { data: allTx } = await supabase
      .from('transactions')
      .select('id, type, amount, currency, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
      
    allTx?.forEach(tx => {
      console.log(`   ${tx.id} | ${tx.type} | ${tx.amount} ${tx.currency} | ${tx.created_at}`);
    });
  }
}

// Запускаем тест
testFarmingDepositTransaction()
  .then(() => console.log('\n=== ТЕСТ ЗАВЕРШЕН ===\n'))
  .catch(err => console.error('Ошибка:', err));