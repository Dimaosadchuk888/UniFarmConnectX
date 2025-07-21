/**
 * КОМПЕНСАЦИЯ USER 228 - Прямое SQL выполнение
 * Используем тот же подход что и в других диагностических скриптах
 */

// Импортируем supabase клиент из core
async function compensateUser228() {
  console.log('💰 КОМПЕНСАЦИЯ USER 228 - ПОТЕРЯННЫЙ TON ДЕПОЗИТ');
  console.log('=' + '='.repeat(50));
  
  try {
    // Импортируем supabase через require
    const { supabase } = require('./dist/core/supabase.js');
    
    console.log('✅ Supabase клиент успешно импортирован');
    
    // Проверяем User 228
    const { data: user228, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_ton')
      .eq('id', 228)
      .single();

    if (userError || !user228) {
      console.log('❌ User 228 не найден:', userError?.message);
      return;
    }

    console.log('👤 НАЙДЕН ПОЛЬЗОВАТЕЛЬ:');
    console.log(`   ID: ${user228.id}`);
    console.log(`   Telegram ID: ${user228.telegram_id}`);
    console.log(`   Username: ${user228.username || 'N/A'}`);
    console.log(`   Текущий TON баланс: ${parseFloat(user228.balance_ton).toFixed(6)} TON`);

    // Проверяем не была ли компенсация уже выплачена
    const { data: existingCompensation } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 228)
      .eq('type', 'FARMING_REWARD')
      .ilike('description', '%компенсация%d1077cd0%')
      .limit(1);

    if (existingCompensation && existingCompensation.length > 0) {
      console.log('⚠️ КОМПЕНСАЦИЯ УЖЕ ВЫПЛАЧЕНА');
      console.log(`   Транзакция ID: ${existingCompensation[0].id}`);
      console.log(`   Дата: ${existingCompensation[0].created_at}`);
      console.log(`   Сумма: ${existingCompensation[0].amount} TON`);
      return;
    }

    console.log('\n✅ ПРОВЕРКИ ПРОЙДЕНЫ - ВЫПОЛНЯЕМ КОМПЕНСАЦИЮ');

    // Создаем компенсационную транзакцию
    const compensationAmount = 1.0;
    const description = 'Компенсация потерянного TON депозита d1077cd0 из-за мошеннической схемы User 249';
    
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: 228,
        type: 'FARMING_REWARD',
        amount: compensationAmount.toString(),
        currency: 'TON',
        description: description,
        metadata: {
          compensation: true,
          original_transaction: 'd1077cd0',
          fraud_case: 'User_249_scheme',
          compensation_date: new Date().toISOString(),
          authorized_by: 'system_admin',
          reason: 'Lost TON deposit due to fraudulent referral scheme'
        }
      })
      .select()
      .single();

    if (transactionError) {
      console.log('❌ Ошибка создания транзакции:', transactionError.message);
      return;
    }

    console.log('\n📝 ТРАНЗАКЦИЯ СОЗДАНА:');
    console.log(`   ID: ${transaction.id}`);
    console.log(`   Сумма: ${transaction.amount} ${transaction.currency}`);
    console.log(`   Дата: ${transaction.created_at}`);

    // Обновляем баланс пользователя
    const newBalance = parseFloat(user228.balance_ton) + compensationAmount;
    const { error: balanceError } = await supabase
      .from('users')
      .update({ balance_ton: newBalance.toString() })
      .eq('id', 228);

    if (balanceError) {
      console.log('❌ Ошибка обновления баланса:', balanceError.message);
      
      // Пытаемся откатить транзакцию
      await supabase.from('transactions').delete().eq('id', transaction.id);
      console.log('🔄 Транзакция удалена из-за ошибки баланса');
      return;
    }

    console.log('\n💰 БАЛАНС ОБНОВЛЕН:');
    console.log(`   Старый баланс: ${parseFloat(user228.balance_ton).toFixed(6)} TON`);
    console.log(`   Компенсация: +${compensationAmount.toFixed(6)} TON`);
    console.log(`   Новый баланс: ${newBalance.toFixed(6)} TON`);

    // Финальная проверка
    const { data: updatedUser } = await supabase
      .from('users')
      .select('balance_ton')
      .eq('id', 228)
      .single();

    if (updatedUser) {
      console.log(`   Подтверждение: ${parseFloat(updatedUser.balance_ton).toFixed(6)} TON`);
    }

    console.log('\n🎉 КОМПЕНСАЦИЯ УСПЕШНО ВЫПЛАЧЕНА!');
    console.log('📋 ИТОГИ:');
    console.log(`   ✅ User 228 получил 1.0 TON компенсацию`);
    console.log(`   ✅ Транзакция ID: ${transaction.id}`);
    console.log(`   ✅ Баланс корректно обновлен`);
    console.log(`   ✅ Справедливость восстановлена`);

  } catch (error) {
    console.log('❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.log('🛑 Компенсация НЕ выполнена');
  }
}

console.log('🚀 ЗАПУСК КОМПЕНСАЦИИ ЧЕРЕЗ 3 СЕКУНДЫ...');
console.log('💡 Для отмены нажмите Ctrl+C');

setTimeout(compensateUser228, 3000);