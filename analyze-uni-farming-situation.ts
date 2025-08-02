import { supabase } from './core/supabaseClient';

async function analyzeUniFarmingSituation() {
  console.log('=== ДЕТАЛЬНЫЙ АНАЛИЗ СИТУАЦИИ С uni_farming_data ===\n');
  
  // 1. Проверим тип объекта uni_farming_data
  const { data: tableInfo, error: tableError } = await supabase
    .rpc('get_table_type', { table_name: 'uni_farming_data' })
    .single();
    
  if (tableInfo) {
    console.log('1. Тип объекта uni_farming_data:', tableInfo);
  } else {
    // Альтернативный способ
    try {
      // Попробуем сделать INSERT чтобы понять, это таблица или VIEW
      const { error: insertTest } = await supabase
        .from('uni_farming_data')
        .insert({ user_id: 999999, deposit_amount: '0' });
        
      if (insertTest && insertTest.message.includes('view')) {
        console.log('1. uni_farming_data - это VIEW (представление)');
      } else {
        console.log('1. uni_farming_data - это ТАБЛИЦА');
        // Удалим тестовую запись
        await supabase.from('uni_farming_data').delete().eq('user_id', 999999);
      }
    } catch (e) {
      console.log('1. Не удалось определить тип объекта');
    }
  }
  
  // 2. Сравним данные между users и uni_farming_data
  console.log('\n2. Сравнение данных между таблицами:');
  
  // Получим несколько пользователей с депозитами
  const { data: usersWithDeposits } = await supabase
    .from('users')
    .select('id, uni_deposit_amount, uni_farming_active, uni_farming_start_timestamp')
    .gt('uni_deposit_amount', 0)
    .limit(5);
    
  if (usersWithDeposits) {
    for (const user of usersWithDeposits) {
      const { data: farmingData } = await supabase
        .from('uni_farming_data')
        .select('deposit_amount, is_active, farming_start_timestamp')
        .eq('user_id', user.id)
        .single();
        
      console.log(`\nПользователь ${user.id}:`);
      console.log(`  users.uni_deposit_amount: ${user.uni_deposit_amount}`);
      console.log(`  uni_farming_data.deposit_amount: ${farmingData?.deposit_amount || 'НЕТ ЗАПИСИ'}`);
      console.log(`  Синхронизировано: ${user.uni_deposit_amount == farmingData?.deposit_amount ? '✅' : '❌'}`);
    }
  }
  
  // 3. Проверим, есть ли в uni_farming_data записи, которых нет в users
  console.log('\n3. Проверка орфанных записей:');
  const { data: allFarmingUsers } = await supabase
    .from('uni_farming_data')
    .select('user_id')
    .gt('deposit_amount', 0);
    
  if (allFarmingUsers) {
    const farmingUserIds = allFarmingUsers.map(u => u.user_id);
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id')
      .in('id', farmingUserIds);
      
    const existingUserIds = existingUsers?.map(u => u.id) || [];
    const orphanedIds = farmingUserIds.filter(id => !existingUserIds.includes(id));
    
    console.log(`Всего записей в uni_farming_data: ${farmingUserIds.length}`);
    console.log(`Существующих пользователей: ${existingUserIds.length}`);
    console.log(`Орфанных записей: ${orphanedIds.length}`);
    if (orphanedIds.length > 0) {
      console.log('Орфанные user_id:', orphanedIds.slice(0, 10));
    }
  }
  
  // 4. Проверим структуру и определим источник данных
  console.log('\n4. Анализ структуры данных:');
  
  // Попробуем обновить поле в users и проверим, изменится ли оно в uni_farming_data
  const testUserId = usersWithDeposits?.[0]?.id;
  if (testUserId) {
    const originalAmount = usersWithDeposits[0].uni_deposit_amount;
    const testAmount = (parseFloat(originalAmount) + 0.01).toString();
    
    // Обновим в users
    await supabase
      .from('users')
      .update({ uni_deposit_amount: testAmount })
      .eq('id', testUserId);
      
    // Проверим в uni_farming_data
    const { data: updatedFarming } = await supabase
      .from('uni_farming_data')
      .select('deposit_amount')
      .eq('user_id', testUserId)
      .single();
      
    console.log(`Тест обновления для пользователя ${testUserId}:`);
    console.log(`  Изменили users.uni_deposit_amount: ${originalAmount} → ${testAmount}`);
    console.log(`  uni_farming_data.deposit_amount: ${updatedFarming?.deposit_amount}`);
    console.log(`  Автоматически синхронизировано: ${updatedFarming?.deposit_amount == testAmount ? '✅ (это VIEW)' : '❌ (это отдельная таблица)'}`);
    
    // Вернём обратно
    await supabase
      .from('users')
      .update({ uni_deposit_amount: originalAmount })
      .eq('id', testUserId);
  }
  
  console.log('\n=== РЕКОМЕНДАЦИИ ===');
  console.log('На основе анализа определим оптимальную стратегию...');
}

analyzeUniFarmingSituation().catch(console.error);