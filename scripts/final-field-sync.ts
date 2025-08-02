import { supabase } from '../core/supabase.js';

async function finalFieldSync() {
  console.log('🔄 ФИНАЛЬНАЯ СИНХРОНИЗАЦИЯ ДУБЛИРУЮЩИХСЯ ПОЛЕЙ');
  console.log('='.repeat(60));
  
  // 1. Синхронизация uni_deposit_amount и uni_farming_deposit
  console.log('\n1️⃣ Синхронизация uni_deposit полей...');
  
  const { data: depositUsers, error: depositError } = await supabase
    .from('users')
    .select('id, uni_deposit_amount, uni_farming_deposit');
  
  if (depositError) {
    console.error('Ошибка получения данных:', depositError);
    return;
  }
  
  let depositSynced = 0;
  for (const user of depositUsers || []) {
    if (user.uni_deposit_amount !== user.uni_farming_deposit) {
      // Используем uni_deposit_amount как главное поле
      const primaryValue = user.uni_deposit_amount || user.uni_farming_deposit || 0;
      
      const { error } = await supabase
        .from('users')
        .update({ 
          uni_deposit_amount: primaryValue,
          uni_farming_deposit: primaryValue 
        })
        .eq('id', user.id);
      
      if (!error) {
        depositSynced++;
        console.log(`✅ User ${user.id}: синхронизирован uni_deposit = ${primaryValue}`);
      } else {
        console.error(`❌ User ${user.id}: ошибка синхронизации:`, error);
      }
    }
  }
  console.log(`Синхронизировано uni_deposit записей: ${depositSynced}`);
  
  // 2. Синхронизация ton_boost_package и ton_boost_package_id
  console.log('\n2️⃣ Синхронизация ton_boost полей...');
  
  const { data: boostUsers, error: boostError } = await supabase
    .from('users')
    .select('id, ton_boost_package, ton_boost_package_id');
  
  if (boostError) {
    console.error('Ошибка получения данных:', boostError);
    return;
  }
  
  let boostSynced = 0;
  for (const user of boostUsers || []) {
    if (user.ton_boost_package !== user.ton_boost_package_id) {
      // Используем ton_boost_package как главное поле
      // Если оба null или 0, ставим 0
      const primaryValue = user.ton_boost_package || user.ton_boost_package_id || 0;
      
      const { error } = await supabase
        .from('users')
        .update({ 
          ton_boost_package: primaryValue,
          ton_boost_package_id: primaryValue 
        })
        .eq('id', user.id);
      
      if (!error) {
        boostSynced++;
        console.log(`✅ User ${user.id}: синхронизирован ton_boost = ${primaryValue}`);
      } else {
        console.error(`❌ User ${user.id}: ошибка синхронизации:`, error);
      }
    }
  }
  console.log(`Синхронизировано ton_boost записей: ${boostSynced}`);
  
  // 3. Проверка результатов
  console.log('\n3️⃣ Проверка результатов синхронизации...');
  
  const { data: checkUsers } = await supabase
    .from('users')
    .select('id, uni_deposit_amount, uni_farming_deposit, ton_boost_package, ton_boost_package_id, wallet, ton_wallet_address');
  
  let finalDepositDiffs = 0;
  let finalBoostDiffs = 0;
  let finalWalletDiffs = 0;
  
  checkUsers?.forEach(user => {
    if (user.uni_deposit_amount !== user.uni_farming_deposit) finalDepositDiffs++;
    if (user.ton_boost_package !== user.ton_boost_package_id) finalBoostDiffs++;
    if (user.wallet !== user.ton_wallet_address) finalWalletDiffs++;
  });
  
  console.log('\n📊 ФИНАЛЬНАЯ СТАТИСТИКА:');
  console.log(`  - Всего пользователей: ${checkUsers?.length || 0}`);
  console.log(`  - Различий в uni_deposit полях: ${finalDepositDiffs}`);
  console.log(`  - Различий в ton_boost полях: ${finalBoostDiffs}`);
  console.log(`  - Различий в wallet полях: ${finalWalletDiffs}`);
  
  if (finalDepositDiffs === 0 && finalBoostDiffs === 0 && finalWalletDiffs === 0) {
    console.log('\n✅ ВСЕ ПОЛЯ УСПЕШНО СИНХРОНИЗИРОВАНЫ!');
    console.log('Теперь можно безопасно удалять дублирующиеся поля из БД.');
  } else {
    console.log('\n⚠️ Остались несинхронизированные данные!');
  }
}

finalFieldSync().catch(console.error);