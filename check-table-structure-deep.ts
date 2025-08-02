import { supabase } from './core/supabaseClient';

async function checkTableStructureDeep() {
  console.log('=== ГЛУБОКИЙ АНАЛИЗ СТРУКТУРЫ uni_farming_data ===\n');
  
  // 1. Попробуем обновить каждое поле отдельно
  console.log('1. Тест обновления полей по отдельности:\n');
  const userId = 184;
  
  // Тест 1: только deposit_amount
  console.log('Тест UPDATE только deposit_amount:');
  const { error: test1 } = await supabase
    .from('uni_farming_data')
    .update({ deposit_amount: '100' })
    .eq('user_id', userId);
  console.log(test1 ? `❌ Ошибка: ${test1.message}` : '✅ Успешно');
  
  // Тест 2: только farming_deposit
  console.log('\nТест UPDATE только farming_deposit:');
  const { error: test2 } = await supabase
    .from('uni_farming_data')
    .update({ farming_deposit: '100' })
    .eq('user_id', userId);
  console.log(test2 ? `❌ Ошибка: ${test2.message}` : '✅ Успешно');
  
  // Тест 3: deposit_amount и farming_deposit вместе
  console.log('\nТест UPDATE deposit_amount + farming_deposit:');
  const { error: test3 } = await supabase
    .from('uni_farming_data')
    .update({ 
      deposit_amount: '100',
      farming_deposit: '100'
    })
    .eq('user_id', userId);
  console.log(test3 ? `❌ Ошибка: ${test3.message}` : '✅ Успешно');
  
  // Тест 4: другие поля
  console.log('\nТест UPDATE is_active + farming_last_update:');
  const { error: test4 } = await supabase
    .from('uni_farming_data')
    .update({ 
      is_active: true,
      farming_last_update: new Date().toISOString()
    })
    .eq('user_id', userId);
  console.log(test4 ? `❌ Ошибка: ${test4.message}` : '✅ Успешно');
  
  // 2. Проверим, является ли uni_farming_data VIEW с правилами
  console.log('\n\n2. Анализ типа объекта:\n');
  
  // Попробуем создать новую запись с минимальными данными
  console.log('Тест INSERT минимальных данных:');
  const { error: insertTest } = await supabase
    .from('uni_farming_data')
    .insert({
      user_id: 999998,
      deposit_amount: '1'
    });
    
  if (insertTest) {
    console.log(`❌ INSERT не работает: ${insertTest.message}`);
    if (insertTest.message.includes('view')) {
      console.log('→ Это VIEW с ограничениями!');
    } else if (insertTest.message.includes('multiple assignments')) {
      console.log('→ Есть триггер или правило, вызывающее конфликт!');
    }
  } else {
    console.log('✅ INSERT работает, удаляем тестовую запись...');
    await supabase.from('uni_farming_data').delete().eq('user_id', 999998);
  }
  
  // 3. Проверим схему с полями
  console.log('\n\n3. Проверка связи полей:\n');
  const { data: sample } = await supabase
    .from('uni_farming_data')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  if (sample) {
    console.log('Данные пользователя 184:');
    console.log(`  deposit_amount: ${sample.deposit_amount}`);
    console.log(`  farming_deposit: ${sample.farming_deposit}`);
    console.log(`  Равны ли значения: ${sample.deposit_amount === sample.farming_deposit ? 'ДА' : 'НЕТ'}`);
  }
  
  console.log('\n=== ВЫВОД ===');
  console.log('Если поля нельзя обновить вместе, возможные причины:');
  console.log('1. uni_farming_data - это VIEW с INSTEAD OF триггерами');
  console.log('2. Есть CHECK constraint или RULE');
  console.log('3. Поля deposit_amount и farming_deposit связаны в БД');
}

checkTableStructureDeep().catch(console.error);