#!/usr/bin/env node
/**
 * Тестирование реального вызова API фарминга с проверкой создания транзакций
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function testRealFarmingDeposit() {
  console.log('🧪 Тест реального API вызова фарминга...\n');

  try {
    // 1. Получаем текущий баланс и депозит User 184
    const { data: beforeData, error: beforeError } = await supabase
      .from('users')
      .select('id, balance_uni, uni_deposit_amount')
      .eq('id', 184)
      .single();

    if (beforeError) {
      console.error('❌ Ошибка получения данных BEFORE:', beforeError);
      return;
    }

    console.log('📊 BEFORE - User 184:');
    console.log(`   Balance UNI: ${beforeData.balance_uni}`);
    console.log(`   Deposit Amount: ${beforeData.uni_deposit_amount}\n`);

    // 2. Получаем количество транзакций BEFORE
    const { data: beforeTransactions, error: beforeTxError } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', 184)
      .eq('type', 'FARMING_DEPOSIT');

    if (beforeTxError) {
      console.error('❌ Ошибка получения транзакций BEFORE:', beforeTxError);
      return;
    }

    console.log(`📈 BEFORE - Количество FARMING_DEPOSIT транзакций: ${beforeTransactions.length}\n`);

    // 3. Делаем HTTP запрос к API фарминга
    console.log('📡 Выполняю POST /api/v2/farming/deposit...');

    const fetch = require('node-fetch');
    
    // Сначала получим JWT токен для User 184
    const authResponse = await fetch('http://localhost:3000/api/v2/auth/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        initData: 'user=%7B%22id%22%3A184%2C%22first_name%22%3A%22Test%22%2C%22username%22%3A%22test_user_184%22%7D&hash=test&start_param=184'
      })
    });

    const authData = await authResponse.json();
    
    if (!authData.success) {
      console.error('❌ Ошибка аутентификации:', authData);
      return;
    }

    const jwtToken = authData.data.token;
    console.log('✅ JWT токен получен');

    // Теперь делаем депозит
    const farmingResponse = await fetch('http://localhost:3000/api/v2/farming/deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({
        amount: 500  // Тестовый депозит 500 UNI
      })
    });

    const farmingData = await farmingResponse.json();
    console.log('📝 Ответ API:', farmingData);

    // 4. Проверяем данные AFTER
    await new Promise(resolve => setTimeout(resolve, 1000)); // Ждём секунду

    const { data: afterData, error: afterError } = await supabase
      .from('users')
      .select('id, balance_uni, uni_deposit_amount')
      .eq('id', 184)
      .single();

    if (afterError) {
      console.error('❌ Ошибка получения данных AFTER:', afterError);
      return;
    }

    console.log('\n📊 AFTER - User 184:');
    console.log(`   Balance UNI: ${afterData.balance_uni}`);
    console.log(`   Deposit Amount: ${afterData.uni_deposit_amount}`);

    // 5. Проверяем транзакции AFTER
    const { data: afterTransactions, error: afterTxError } = await supabase
      .from('transactions')
      .select('id, amount, description, created_at')
      .eq('user_id', 184)
      .eq('type', 'FARMING_DEPOSIT')
      .order('created_at', { ascending: false })
      .limit(3);

    if (afterTxError) {
      console.error('❌ Ошибка получения транзакций AFTER:', afterTxError);
      return;
    }

    console.log(`\n📈 AFTER - Количество FARMING_DEPOSIT транзакций: ${afterTransactions.length}`);

    if (afterTransactions.length > beforeTransactions.length) {
      console.log('✅ НОВАЯ ТРАНЗАКЦИЯ СОЗДАНА!');
      const newTransaction = afterTransactions[0];
      console.log(`   ID: ${newTransaction.id}`);
      console.log(`   Amount: ${newTransaction.amount}`);
      console.log(`   Description: ${newTransaction.description}`);
      console.log(`   Created: ${newTransaction.created_at}`);
    } else {
      console.log('❌ НОВАЯ ТРАНЗАКЦИЯ НЕ СОЗДАНА!');
    }

    // 6. Анализ изменений
    const balanceChange = beforeData.balance_uni - afterData.balance_uni;
    const depositChange = afterData.uni_deposit_amount - beforeData.uni_deposit_amount;

    console.log('\n📈 АНАЛИЗ ИЗМЕНЕНИЙ:');
    console.log(`   Balance изменение: ${balanceChange > 0 ? '-' : '+'}${Math.abs(balanceChange)} UNI`);
    console.log(`   Deposit изменение: +${depositChange} UNI`);

    if (balanceChange === 500 && depositChange === 500) {
      console.log('✅ Финансовые операции выполнены корректно');
    } else {
      console.log('⚠️ Несоответствие в финансовых операциях');
    }

  } catch (error) {
    console.error('❌ Исключение при тесте:', error);
  }
}

testRealFarmingDeposit();