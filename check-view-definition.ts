import { supabase } from './core/supabaseClient';

async function checkViewDefinition() {
  console.log('=== АНАЛИЗ VIEW uni_farming_data ===\n');
  
  // 1. Проверим определение VIEW
  const { data: viewDef, error: viewError } = await supabase.rpc('get_view_definition', {
    view_name: 'uni_farming_data'
  }).single();
  
  if (viewError) {
    console.log('Не удалось получить определение VIEW через RPC\n');
    
    // Альтернативный способ - проверим структуру
    const { data: sample } = await supabase
      .from('uni_farming_data')
      .select('*')
      .limit(1)
      .single();
      
    if (sample) {
      console.log('Структура VIEW uni_farming_data:');
      Object.keys(sample).forEach(key => {
        console.log(`  - ${key}: ${typeof sample[key]}`);
      });
    }
  } else {
    console.log('Определение VIEW:', viewDef);
  }
  
  // 2. Проверим, какие данные есть в VIEW
  console.log('\n2. Статистика данных в VIEW:');
  const { count: totalCount } = await supabase
    .from('uni_farming_data')
    .select('*', { count: 'exact', head: true });
    
  console.log(`Всего записей: ${totalCount}`);
  
  // 3. Проверим, есть ли активные фармеры
  const { count: activeCount } = await supabase
    .from('uni_farming_data')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
    
  console.log(`Активных фармеров: ${activeCount}`);
  
  // 4. Проверим связь с таблицей users
  console.log('\n3. Проверка синхронизации с таблицей users:');
  
  // Получим пользователя с депозитом из users
  const { data: userWithDeposit } = await supabase
    .from('users')
    .select('id, uni_deposit_amount, uni_farming_active')
    .gt('uni_deposit_amount', 0)
    .limit(1)
    .single();
    
  if (userWithDeposit) {
    console.log(`\nПользователь ${userWithDeposit.id} в users:`);
    console.log(`  - uni_deposit_amount: ${userWithDeposit.uni_deposit_amount}`);
    console.log(`  - uni_farming_active: ${userWithDeposit.uni_farming_active}`);
    
    // Проверим этого же пользователя в VIEW
    const { data: viewData } = await supabase
      .from('uni_farming_data')
      .select('deposit_amount, farming_deposit, is_active')
      .eq('user_id', userWithDeposit.id)
      .single();
      
    if (viewData) {
      console.log(`\nТот же пользователь в uni_farming_data VIEW:`);
      console.log(`  - deposit_amount: ${viewData.deposit_amount}`);
      console.log(`  - farming_deposit: ${viewData.farming_deposit}`);
      console.log(`  - is_active: ${viewData.is_active}`);
    }
  }
  
  console.log('\n=== РЕКОМЕНДАЦИИ ===');
  console.log('1. VIEW скорее всего просто отображает данные из таблицы users');
  console.log('2. Можно работать напрямую с таблицей users вместо VIEW');
  console.log('3. Или создать реальную таблицу uni_farming_data вместо VIEW');
}

checkViewDefinition().catch(console.error);