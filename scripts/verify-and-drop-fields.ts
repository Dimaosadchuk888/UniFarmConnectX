import { supabase } from '../core/supabase.js';

async function verifyAndDropFields() {
  console.log('🔍 ПРОВЕРКА ПЕРЕД УДАЛЕНИЕМ ДУБЛИРУЮЩИХСЯ ПОЛЕЙ');
  console.log('='.repeat(60));
  
  // Проверка различий в данных
  const { data: users, error } = await supabase
    .from('users')
    .select('id, uni_deposit_amount, uni_farming_deposit, ton_boost_package, ton_boost_package_id, wallet, ton_wallet_address');
  
  if (error) {
    console.error('Ошибка при проверке данных:', error);
    return;
  }
  
  let depositDiffs = 0;
  let boostDiffs = 0;
  let walletDiffs = 0;
  
  users?.forEach(user => {
    if (user.uni_deposit_amount !== user.uni_farming_deposit) depositDiffs++;
    if (user.ton_boost_package !== user.ton_boost_package_id) boostDiffs++;
    if (user.wallet !== user.ton_wallet_address) walletDiffs++;
  });
  
  console.log('\n📊 СТАТИСТИКА:');
  console.log(`  - Всего пользователей: ${users?.length || 0}`);
  console.log(`  - Различий в uni_deposit полях: ${depositDiffs}`);
  console.log(`  - Различий в ton_boost полях: ${boostDiffs}`);
  console.log(`  - Различий в wallet полях: ${walletDiffs}`);
  
  if (depositDiffs === 0 && boostDiffs === 0 && walletDiffs === 0) {
    console.log('\n✅ ВСЕ ДАННЫЕ СИНХРОНИЗИРОВАНЫ!');
    console.log('Можно безопасно удалять дублирующиеся поля.');
    console.log('\n📝 SQL ДЛЯ УДАЛЕНИЯ ПОЛЕЙ:');
    console.log('-- Выполните этот SQL в Supabase SQL Editor:');
    console.log('ALTER TABLE users DROP COLUMN IF EXISTS uni_farming_deposit;');
    console.log('ALTER TABLE users DROP COLUMN IF EXISTS ton_boost_package_id;');
    console.log('ALTER TABLE users DROP COLUMN IF EXISTS wallet;');
    console.log('\n-- Проверка результата:');
    console.log("SELECT column_name FROM information_schema.columns");
    console.log("WHERE table_schema = 'public' AND table_name = 'users'");
    console.log("AND column_name IN ('uni_farming_deposit', 'ton_boost_package_id', 'wallet');");
  } else {
    console.log('\n⚠️ ОБНАРУЖЕНЫ НЕСИНХРОНИЗИРОВАННЫЕ ДАННЫЕ!');
    console.log('Необходимо сначала синхронизировать все данные.');
  }
}

verifyAndDropFields().catch(console.error);