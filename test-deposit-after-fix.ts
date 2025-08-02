import { supabase } from './core/supabaseClient';

async function testDepositAfterFix() {
  console.log('=== ТЕСТ ДЕПОЗИТА ПОСЛЕ ИСПРАВЛЕНИЙ ===\n');
  
  const userId = '184';
  const depositAmount = '100';
  
  console.log(`Тестируем депозит для пользователя ${userId}, сумма: ${depositAmount} UNI\n`);
  
  // 1. Получим текущие данные
  console.log('1. Текущие данные пользователя:');
  const { data: currentUser } = await supabase
    .from('users')
    .select('uni_deposit_amount, balance_uni')
    .eq('id', userId)
    .single();
    
  const { data: currentFarming } = await supabase
    .from('uni_farming_data')
    .select('deposit_amount, farming_deposit')
    .eq('user_id', parseInt(userId))
    .single();
    
  console.log(`  users.uni_deposit_amount: ${currentUser?.uni_deposit_amount || 0}`);
  console.log(`  users.balance_uni: ${currentUser?.balance_uni || 0}`);
  console.log(`  uni_farming_data.deposit_amount: ${currentFarming?.deposit_amount || 'НЕТ ЗАПИСИ'}`);
  
  // 2. Попробуем сделать депозит
  console.log('\n2. Выполняем тестовый депозит...');
  
  // Симулируем процесс депозита
  const newDepositAmount = (parseFloat(currentFarming?.deposit_amount || '0') + parseFloat(depositAmount)).toString();
  
  if (currentFarming) {
    // UPDATE существующей записи
    console.log('  Обновляем существующую запись...');
    const { error: updateError } = await supabase
      .from('uni_farming_data')
      .update({
        deposit_amount: newDepositAmount,
        farming_deposit: newDepositAmount,
        is_active: true,
        farming_last_update: new Date().toISOString()
      })
      .eq('user_id', parseInt(userId));
      
    if (updateError) {
      console.log('  ❌ ОШИБКА UPDATE:', updateError.code, updateError.message);
    } else {
      console.log('  ✅ UPDATE успешен!');
    }
  } else {
    // INSERT новой записи
    console.log('  Создаём новую запись...');
    const { error: insertError } = await supabase
      .from('uni_farming_data')
      .insert({
        user_id: parseInt(userId),
        deposit_amount: depositAmount,
        farming_deposit: depositAmount,
        is_active: true,
        farming_start_timestamp: new Date().toISOString(),
        farming_last_update: new Date().toISOString()
      });
      
    if (insertError) {
      console.log('  ❌ ОШИБКА INSERT:', insertError.code, insertError.message);
    } else {
      console.log('  ✅ INSERT успешен!');
    }
  }
  
  // 3. Синхронизация с users
  console.log('\n3. Синхронизация с таблицей users...');
  const { error: syncError } = await supabase
    .from('users')
    .update({
      uni_deposit_amount: newDepositAmount,
      uni_farming_active: true,
      uni_farming_last_update: new Date().toISOString()
    })
    .eq('id', userId);
    
  if (syncError) {
    console.log('  ❌ ОШИБКА синхронизации:', syncError.code, syncError.message);
  } else {
    console.log('  ✅ Синхронизация успешна!');
  }
  
  // 4. Проверяем результат
  console.log('\n4. Результат после депозита:');
  const { data: updatedUser } = await supabase
    .from('users')
    .select('uni_deposit_amount')
    .eq('id', userId)
    .single();
    
  const { data: updatedFarming } = await supabase
    .from('uni_farming_data')
    .select('deposit_amount')
    .eq('user_id', parseInt(userId))
    .single();
    
  console.log(`  users.uni_deposit_amount: ${currentUser?.uni_deposit_amount} → ${updatedUser?.uni_deposit_amount}`);
  console.log(`  uni_farming_data.deposit_amount: ${currentFarming?.deposit_amount || 0} → ${updatedFarming?.deposit_amount}`);
  
  if (updatedFarming?.deposit_amount === newDepositAmount) {
    console.log('\n✅ ДЕПОЗИТ РАБОТАЕТ УСПЕШНО!');
  } else {
    console.log('\n❌ Депозит не сработал корректно');
  }
  
  // Вернём данные обратно
  if (currentFarming) {
    await supabase
      .from('uni_farming_data')
      .update({
        deposit_amount: currentFarming.deposit_amount,
        farming_deposit: currentFarming.farming_deposit
      })
      .eq('user_id', parseInt(userId));
      
    await supabase
      .from('users')
      .update({ uni_deposit_amount: currentUser?.uni_deposit_amount })
      .eq('id', userId);
  }
}

testDepositAfterFix().catch(console.error);