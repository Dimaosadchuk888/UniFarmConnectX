import { supabase } from './core/supabase';

async function analyzeDeposits() {
  const userId = 74;
  console.log('=== АНАЛИЗ ДЕПОЗИТОВ И ТРАНЗАКЦИЙ ===\n');
  
  // 1. Получаем все транзакции депозитов
  const { data: deposits } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'FARMING_DEPOSIT')
    .order('created_at', { ascending: false });
    
  console.log(`📊 Найдено ${deposits?.length || 0} транзакций FARMING_DEPOSIT`);
  
  let totalDeposits = 0;
  deposits?.forEach((dep, idx) => {
    totalDeposits += parseFloat(dep.amount_uni || '0');
    console.log(`  ${idx + 1}. ${dep.created_at}: ${dep.amount_uni} UNI (${dep.description})`);
  });
  
  console.log(`\n💰 Сумма всех депозитов из транзакций: ${totalDeposits} UNI`);
  
  // 2. Получаем текущий депозит из uni_farming_data
  const { data: farmingData } = await supabase
    .from('uni_farming_data')
    .select('deposit_amount, is_active, created_at, updated_at')
    .eq('user_id', userId)
    .single();
    
  console.log(`\n📈 Текущий депозит в uni_farming_data: ${farmingData?.deposit_amount || 0} UNI`);
  console.log(`   Активен: ${farmingData?.is_active ? '✅' : '❌'}`);
  console.log(`   Создан: ${farmingData?.created_at}`);
  console.log(`   Обновлен: ${farmingData?.updated_at}`);
  
  // 3. Получаем доходы от фарминга
  const { data: income } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'FARMING_INCOME')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log(`\n📈 Последние 5 доходов от фарминга:`);
  income?.forEach((inc, idx) => {
    console.log(`  ${idx + 1}. ${inc.created_at}: +${inc.amount_uni} UNI`);
  });
  
  // 4. Анализ расхождений
  const difference = (farmingData?.deposit_amount || 0) - totalDeposits;
  console.log(`\n🔍 АНАЛИЗ РАСХОЖДЕНИЙ:`);
  console.log(`   Разница: ${difference} UNI`);
  
  if (difference > 0) {
    console.log(`   ⚠️ Депозит в farming_data БОЛЬШЕ суммы транзакций на ${difference} UNI`);
    console.log(`   Возможные причины:`);
    console.log(`   - Прямое обновление deposit_amount без создания транзакций`);
    console.log(`   - Миграция данных из старой версии`);
    console.log(`   - Начисление процентов напрямую в депозит`);
  } else if (difference < 0) {
    console.log(`   ⚠️ Депозит в farming_data МЕНЬШЕ суммы транзакций на ${Math.abs(difference)} UNI`);
    console.log(`   Возможные причины:`);
    console.log(`   - Частичные выводы не отражены в транзакциях`);
    console.log(`   - Ошибки синхронизации`);
  } else {
    console.log(`   ✅ Данные синхронизированы корректно`);
  }
}

analyzeDeposits().catch(console.error);