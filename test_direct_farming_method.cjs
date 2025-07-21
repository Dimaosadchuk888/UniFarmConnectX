#!/usr/bin/env node
/**
 * Прямой тест функции depositUniForFarming
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Эмуляция функции из FarmingService
async function testDirectDeposit() {
  console.log('🧪 ПРЯМОЙ ТЕСТ ФУНКЦИИ СОЗДАНИЯ ТРАНЗАКЦИЙ...\n');

  try {
    const userId = 184;
    const depositAmount = 250; // Тестовый депозит

    console.log('📊 BEFORE - Проверяю текущее состояние...');
    
    // Проверяем транзакции BEFORE
    const { data: beforeTransactions, error: beforeTxError } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'FARMING_DEPOSIT');

    if (beforeTxError) {
      console.error('❌ Ошибка получения транзакций BEFORE:', beforeTxError);
      return;
    }

    console.log(`   Текущее количество FARMING_DEPOSIT транзакций: ${beforeTransactions.length}`);

    // Проверяем баланс пользователя
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, balance_uni, uni_deposit_amount')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Ошибка получения пользователя:', userError);
      return;
    }

    console.log(`   Balance UNI: ${user.balance_uni}`);
    console.log(`   Deposit Amount: ${user.uni_deposit_amount}`);

    // Проверяем, достаточно ли средств
    if (user.balance_uni < depositAmount) {
      console.log('❌ Недостаточно средств для депозита');
      return;
    }

    console.log('\n🔧 ПРЯМОЕ СОЗДАНИЕ ТРАНЗАКЦИИ...');

    // Создаём транзакцию точно так же, как в FarmingService
    const transactionPayload = {
      user_id: userId,
      type: 'FARMING_DEPOSIT',
      amount: depositAmount.toString(),
      amount_uni: depositAmount.toString(),
      amount_ton: '0',
      currency: 'UNI',
      status: 'completed',
      description: `UNI farming deposit: ${depositAmount}`
    };

    console.log('📝 Payload транзакции:', transactionPayload);

    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert([transactionPayload])
      .select()
      .single();

    if (transactionError) {
      console.error('❌ Ошибка создания транзакции:', transactionError);
      return;
    }

    console.log('✅ Транзакция успешно создана!');
    console.log(`   Transaction ID: ${transactionData.id}`);
    console.log(`   Type: ${transactionData.type}`);
    console.log(`   Amount: ${transactionData.amount}`);

    // Теперь обновляем баланс и депозит пользователя
    console.log('\n🔄 ОБНОВЛЕНИЕ БАЛАНСА ПОЛЬЗОВАТЕЛЯ...');

    const newBalanceUni = user.balance_uni - depositAmount;
    const newDepositAmount = user.uni_deposit_amount + depositAmount;

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        balance_uni: newBalanceUni,
        uni_deposit_amount: newDepositAmount,
        uni_farming_active: true,
        uni_farming_start_timestamp: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Ошибка обновления пользователя:', updateError);
      
      // Удаляем созданную транзакцию при ошибке
      await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionData.id);
      
      console.log('🗑️ Транзакция удалена из-за ошибки обновления');
      return;
    }

    console.log('✅ Баланс пользователя обновлён!');
    console.log(`   New Balance UNI: ${updatedUser.balance_uni}`);
    console.log(`   New Deposit Amount: ${updatedUser.uni_deposit_amount}`);
    console.log(`   Farming Active: ${updatedUser.uni_farming_active}`);

    // Проверяем AFTER
    console.log('\n📊 AFTER - Проверяю итоговое состояние...');
    
    const { data: afterTransactions, error: afterTxError } = await supabase
      .from('transactions')
      .select('id, amount, description, created_at')
      .eq('user_id', userId)
      .eq('type', 'FARMING_DEPOSIT')
      .order('created_at', { ascending: false })
      .limit(3);

    if (afterTxError) {
      console.error('❌ Ошибка получения транзакций AFTER:', afterTxError);
      return;
    }

    console.log(`   Количество FARMING_DEPOSIT транзакций: ${afterTransactions.length}`);
    console.log('   Последние транзакции:');
    
    afterTransactions.forEach((tx, i) => {
      const created = new Date(tx.created_at);
      const now = new Date();
      const diffMinutes = (now - created) / (1000 * 60);
      
      console.log(`   ${i + 1}. ID: ${tx.id}, Amount: ${tx.amount}, Created: ${diffMinutes.toFixed(1)} min ago`);
    });

    console.log('\n✅ ПРЯМОЙ ТЕСТ ЗАВЕРШЁН УСПЕШНО!');
    console.log('   Транзакция создана ✓');
    console.log('   Баланс обновлён ✓');
    console.log('   Депозит увеличен ✓');

  } catch (error) {
    console.error('❌ Исключение при прямом тесте:', error);
  }
}

testDirectDeposit();