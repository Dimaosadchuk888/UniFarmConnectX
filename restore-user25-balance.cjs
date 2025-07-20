/**
 * ВОССТАНОВЛЕНИЕ БАЛАНСА USER #25
 * Компенсация потерянного TON депозита 0.1 TON
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreUser25Balance() {
  console.log('🔧 ВОССТАНОВЛЕНИЕ БАЛАНСА USER #25');
  console.log('='.repeat(40));
  
  try {
    const userId = 25;
    const missingAmount = 0.1; // TON
    
    // 1. Проверяем текущий баланс
    const { data: user, error: getUserError } = await supabase
      .from('users')
      .select('id, balance_ton, balance_uni')
      .eq('id', userId)
      .single();
    
    if (getUserError || !user) {
      console.log('❌ Ошибка получения User #25:', getUserError?.message);
      return;
    }
    
    console.log('📊 ДО ВОССТАНОВЛЕНИЯ:');
    console.log(`   TON баланс: ${user.balance_ton}`);
    console.log(`   UNI баланс: ${user.balance_uni}`);
    
    // 2. Рассчитываем новый баланс
    const currentTon = parseFloat(user.balance_ton || '0');
    const newTonBalance = currentTon + missingAmount;
    
    console.log(`\n🔧 ВОССТАНОВЛЕНИЕ:`);
    console.log(`   Добавляем: ${missingAmount} TON`);
    console.log(`   Новый баланс: ${newTonBalance} TON`);
    
    // 3. Обновляем баланс
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        balance_ton: newTonBalance,
        last_active: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (updateError) {
      console.log('❌ Ошибка обновления баланса:', updateError.message);
      return;
    }
    
    console.log('✅ Баланс успешно обновлен');
    
    // 4. Проверяем результат
    const { data: updatedUser, error: checkError } = await supabase
      .from('users')
      .select('balance_ton, balance_uni')
      .eq('id', userId)
      .single();
    
    if (checkError || !updatedUser) {
      console.log('❌ Ошибка проверки:', checkError?.message);
      return;
    }
    
    console.log('\n📊 ПОСЛЕ ВОССТАНОВЛЕНИЯ:');
    console.log(`   TON баланс: ${updatedUser.balance_ton}`);
    console.log(`   UNI баланс: ${updatedUser.balance_uni}`);
    
    // 5. Создаем компенсационную транзакцию для отчетности
    const { data: compensationTx, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount_ton: missingAmount,
        amount_uni: 0,
        type: 'DEPOSIT',
        currency: 'TON',
        status: 'completed',
        description: `Balance restoration: compensation for lost deposit 00a1ba3c2614f4d65cc346805feea960`,
        metadata: {
          source: 'balance_restoration',
          original_type: 'COMPENSATION',
          reason: 'Lost TON deposit recovery',
          original_tx_id: 840416,
          restored_at: new Date().toISOString()
        }
      })
      .select()
      .single();
    
    if (txError) {
      console.log('⚠️ Баланс восстановлен, но не удалось создать компенсационную транзакцию:', txError.message);
    } else {
      console.log(`✅ Компенсационная транзакция создана: ID ${compensationTx.id}`);
    }
    
    console.log('\n🎉 ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО!');
    console.log('   User #25 получил свои 0.1 TON обратно');
    
  } catch (error) {
    console.log('❌ Критическая ошибка восстановления:', error.message);
  }
}

// Запуск восстановления
restoreUser25Balance().catch(console.error);