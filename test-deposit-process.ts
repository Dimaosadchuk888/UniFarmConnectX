import { supabase } from './core/supabaseClient';

async function testDepositProcess() {
  console.log('=== ТЕСТ ПРОЦЕССА ДЕПОЗИТА ===\n');
  
  const userId = '184'; // Тестовый пользователь
  const depositAmount = '100';
  
  // 1. Проверяем, как работает addDeposit
  console.log('1. Проверка записи в uni_farming_data:');
  
  // Сначала проверим существующую запись
  const { data: existingRecord, error: checkError } = await supabase
    .from('uni_farming_data')
    .select('*')
    .eq('user_id', parseInt(userId))
    .single();
    
  console.log('Существующая запись:', existingRecord ? 'НАЙДЕНА' : 'НЕ НАЙДЕНА');
  if (checkError && checkError.code !== 'PGRST116') {
    console.log('Ошибка при проверке:', checkError);
  }
  
  // 2. Попробуем INSERT новой записи
  if (!existingRecord) {
    console.log('\n2. Тест INSERT в uni_farming_data:');
    const insertData = {
      user_id: parseInt(userId),
      deposit_amount: depositAmount,
      farming_deposit: depositAmount,
      is_active: true,
      farming_start_timestamp: new Date().toISOString(),
      farming_last_update: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('uni_farming_data')
      .insert(insertData)
      .select();
      
    if (insertError) {
      console.log('❌ Ошибка INSERT:', insertError.code, insertError.message);
      console.log('   Детали:', insertError.details || 'нет деталей');
    } else {
      console.log('✅ INSERT успешен:', insertResult);
    }
  } else {
    // 3. Попробуем UPDATE существующей записи
    console.log('\n2. Тест UPDATE в uni_farming_data:');
    const currentDeposit = parseFloat(existingRecord.deposit_amount || '0');
    const newDeposit = (currentDeposit + parseFloat(depositAmount)).toString();
    
    const updateData = {
      deposit_amount: newDeposit,
      farming_deposit: newDeposit,
      is_active: true,
      farming_last_update: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Данные для обновления:', updateData);
    
    const { data: updateResult, error: updateError } = await supabase
      .from('uni_farming_data')
      .update(updateData)
      .eq('user_id', parseInt(userId))
      .select();
      
    if (updateError) {
      console.log('❌ Ошибка UPDATE:', updateError.code, updateError.message);
      console.log('   Детали:', updateError.details || 'нет деталей');
    } else {
      console.log('✅ UPDATE успешен:', updateResult);
    }
  }
  
  // 4. Проверяем синхронизацию с таблицей users
  console.log('\n3. Тест синхронизации с таблицей users:');
  const syncData = {
    uni_deposit_amount: depositAmount,
    uni_farming_active: true,
    uni_farming_last_update: new Date().toISOString()
  };
  
  const { data: syncResult, error: syncError } = await supabase
    .from('users')
    .update(syncData)
    .eq('id', userId)
    .select();
    
  if (syncError) {
    console.log('❌ Ошибка синхронизации с users:', syncError.code, syncError.message);
  } else {
    console.log('✅ Синхронизация с users успешна');
  }
  
  // 5. Проверяем структуру таблицы uni_farming_data
  console.log('\n4. Структура таблицы uni_farming_data:');
  const { data: sampleData } = await supabase
    .from('uni_farming_data')
    .select('*')
    .limit(1)
    .single();
    
  if (sampleData) {
    console.log('Поля в таблице:');
    Object.keys(sampleData).forEach(field => {
      console.log(`   - ${field}: ${typeof sampleData[field]}`);
    });
  }
}

testDepositProcess().catch(console.error);