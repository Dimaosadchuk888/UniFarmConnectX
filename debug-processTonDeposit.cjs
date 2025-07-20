/**
 * ОТЛАДКА processTonDeposit() - ПОИСК ПРИЧИНЫ ОТКАТА БАЛАНСА
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugProcessTonDeposit() {
  console.log('🔍 ОТЛАДКА processTonDeposit()');
  console.log('='.repeat(50));
  
  try {
    // Симулируем логику processTonDeposit() пошагово
    const user_id = 25;
    const ton_tx_hash = 'test_debug_' + Date.now();
    const amount = 0.01; // Тестовая сумма
    const wallet_address = 'test_wallet';
    
    console.log('📊 ВХОДНЫЕ ПАРАМЕТРЫ:');
    console.log(`   User ID: ${user_id}`);
    console.log(`   Amount: ${amount} TON`);
    console.log(`   TX Hash: ${ton_tx_hash}`);
    
    // ШАГ 1: Проверка существующей транзакции
    console.log('\n🔍 ШАГ 1: Проверка дублированной транзакции');
    const existingTransaction = await supabase
      .from('transactions')
      .select('*')
      .eq('description', ton_tx_hash)
      .eq('type', 'DEPOSIT')
      .single();
    
    if (existingTransaction.data) {
      console.log('❌ Транзакция уже существует - останавливаемся');
      return;
    } else {
      console.log('✅ Дублированная транзакция не найдена');
    }
    
    // ШАГ 2: Получение текущего баланса
    console.log('\n💰 ШАГ 2: Получение текущего баланса');
    const { data: user, error: getUserError } = await supabase
      .from('users')
      .select('balance_ton')
      .eq('id', user_id)
      .single();
    
    if (getUserError || !user) {
      console.log('❌ Ошибка получения пользователя:', getUserError?.message);
      return;
    }
    
    const currentBalance = parseFloat(user.balance_ton || '0');
    const newBalance = currentBalance + amount;
    
    console.log(`   Текущий баланс: ${currentBalance} TON`);
    console.log(`   Добавляем: ${amount} TON`);
    console.log(`   Новый баланс: ${newBalance} TON`);
    
    // ШАГ 3: Обновление баланса
    console.log('\n🔄 ШАГ 3: Обновление баланса');
    const { error: updateError } = await supabase
      .from('users')
      .update({ balance_ton: newBalance })
      .eq('id', user_id);
    
    if (updateError) {
      console.log('❌ Ошибка обновления баланса:', updateError.message);
      return;
    } else {
      console.log('✅ Баланс успешно обновлен');
    }
    
    // ПРОМЕЖУТОЧНАЯ ПРОВЕРКА
    console.log('\n🔍 ПРОМЕЖУТОЧНАЯ ПРОВЕРКА БАЛАНСА:');
    const { data: checkUser, error: checkError } = await supabase
      .from('users')
      .select('balance_ton')
      .eq('id', user_id)
      .single();
    
    if (checkError) {
      console.log('❌ Ошибка проверки:', checkError.message);
    } else {
      console.log(`   Баланс после обновления: ${checkUser.balance_ton} TON`);
      if (parseFloat(checkUser.balance_ton) === newBalance) {
        console.log('✅ Баланс корректно сохранен');
      } else {
        console.log('❌ БАЛАНС НЕ СООТВЕТСТВУЕТ ОЖИДАЕМОМУ!');
      }
    }
    
    // ШАГ 4: Создание транзакции
    console.log('\n📝 ШАГ 4: Создание транзакции');
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id,
        amount_ton: amount,
        amount_uni: 0,
        type: 'DEPOSIT',
        currency: 'TON',
        status: 'completed',
        description: `TON deposit from blockchain: ${ton_tx_hash}`,
        metadata: {
          source: 'ton_deposit',
          original_type: 'TON_DEPOSIT',
          wallet_address,
          tx_hash: ton_tx_hash
        }
      })
      .select()
      .single();
    
    if (transactionError) {
      console.log('❌ Ошибка создания транзакции:', transactionError.message);
      
      // Проверяем код отката из оригинала
      console.log('\n🔄 ВЫПОЛНЯЕМ ОТКАТ БАЛАНСА (как в оригинальном коде)');
      await supabase
        .from('users')
        .update({ balance_ton: parseFloat(user.balance_ton || '0') })
        .eq('id', user_id);
      
      console.log('❌ НАЙДЕНА ПРОБЛЕМА: При ошибке транзакции баланс откатывается!');
      return;
    } else {
      console.log(`✅ Транзакция создана: ID ${transaction.id}`);
    }
    
    // ФИНАЛЬНАЯ ПРОВЕРКА
    console.log('\n🔍 ФИНАЛЬНАЯ ПРОВЕРКА:');
    const { data: finalUser, error: finalError } = await supabase
      .from('users')
      .select('balance_ton')
      .eq('id', user_id)
      .single();
    
    if (finalError) {
      console.log('❌ Ошибка финальной проверки:', finalError.message);
    } else {
      console.log(`   Финальный баланс: ${finalUser.balance_ton} TON`);
      
      if (parseFloat(finalUser.balance_ton) === newBalance) {
        console.log('✅ ПРОЦЕСС УСПЕШЕН - баланс сохранен');
      } else {
        console.log('❌ ПРОЦЕСС ПРОВАЛЕН - баланс не соответствует');
      }
    }
    
    // Удаляем тестовую транзакцию
    if (transaction) {
      await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id);
      console.log('🧹 Тестовая транзакция удалена');
    }
    
  } catch (error) {
    console.log('❌ Критическая ошибка отладки:', error.message);
  }
}

debugProcessTonDeposit().catch(console.error);