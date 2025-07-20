/**
 * PRODUCTION ДИАГНОСТИКА USER #25 TON ДЕПОЗИТ
 * БЕЗ ИЗМЕНЕНИЙ В КОД - только анализ Production environment
 */

const { createClient } = require('@supabase/supabase-js');

console.log('\n🎯 PRODUCTION ДИАГНОСТИКА USER #25');
console.log('='.repeat(60));
console.log('User ID: 25');
console.log('Реф-код: REF_1750079004411_nddfp2');  
console.log('TON депозит: 0.1 TON');
console.log('Hash: b30da7471672b8fc154baca674b2cc9c0829ead2a443bfa901f7b676ced2c70d');
console.log('='.repeat(60));

async function diagnoseProductionUser25() {
  try {
    // Проверка переменных окружения для Production
    console.log('\n1️⃣ ПРОВЕРКА PRODUCTION ОКРУЖЕНИЯ');
    const hasSupabaseUrl = !!process.env.SUPABASE_URL;
    const hasSupabaseKey = !!process.env.SUPABASE_KEY;
    const hasDatabaseUrl = !!process.env.DATABASE_URL;
    
    console.log('SUPABASE_URL:', hasSupabaseUrl ? '✅ SET' : '❌ NOT SET');
    console.log('SUPABASE_KEY:', hasSupabaseKey ? '✅ SET' : '❌ NOT SET');
    console.log('DATABASE_URL:', hasDatabaseUrl ? '✅ SET' : '❌ NOT SET');

    if (!hasSupabaseUrl || !hasSupabaseKey) {
      console.log('❌ Production БД недоступна - нет Supabase credentials');
      console.log('⚠️ Возможная причина: диагностика в Preview окружении вместо Production');
      return;
    }

    // Инициализация Supabase клиента
    console.log('\n2️⃣ ПОДКЛЮЧЕНИЕ К PRODUCTION БД');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    console.log('✅ Supabase клиент создан');

    // Поиск User #25 в Production БД
    console.log('\n3️⃣ ПОИСК USER #25 В PRODUCTION БД');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, username, ref_code, balance_ton, balance_uni, created_at')
      .or(`id.eq.25,ref_code.eq.REF_1750079004411_nddfp2`)
      .limit(5);

    if (userError) {
      console.log('❌ Ошибка поиска пользователя:', userError);
      return;
    }

    console.log('Найдено пользователей:', users?.length || 0);
    if (users && users.length > 0) {
      users.forEach(user => {
        console.log(`📋 User ID ${user.id}:`);
        console.log(`   Telegram ID: ${user.telegram_id}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Ref Code: ${user.ref_code}`);
        console.log(`   TON Balance: ${user.balance_ton}`);
        console.log(`   UNI Balance: ${user.balance_uni}`);
        console.log(`   Created: ${user.created_at}`);
      });
    } else {
      console.log('⚠️ User #25 с реф-кодом REF_1750079004411_nddfp2 НЕ НАЙДЕН в Production БД');
    }

    // Поиск TON транзакций для User #25
    console.log('\n4️⃣ ПОИСК TON ТРАНЗАКЦИЙ USER #25');
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .ilike('description', '%TON%')
      .order('created_at', { ascending: false })
      .limit(10);

    if (txError) {
      console.log('❌ Ошибка поиска транзакций:', txError);
    } else {
      console.log('Найдено TON транзакций:', transactions?.length || 0);
      if (transactions && transactions.length > 0) {
        transactions.forEach((tx, index) => {
          console.log(`💳 Транзакция ${index + 1}:`);
          console.log(`   ID: ${tx.id}`);
          console.log(`   Type: ${tx.type}`);
          console.log(`   Amount: ${tx.amount}`);
          console.log(`   Description: ${tx.description}`);
          console.log(`   Created: ${tx.created_at}`);
        });
      }
    }

    // Проверка логов обработки hash транзакции
    console.log('\n5️⃣ АНАЛИЗ ОТСУТСТВИЯ ДАННЫХ');
    console.log('📊 СТАТИСТИКА:');
    console.log(`   User #25 найден: ${users && users.some(u => u.id === 25) ? 'ДА' : 'НЕТ'}`);
    console.log(`   Реф-код найден: ${users && users.some(u => u.ref_code === 'REF_1750079004411_nddfp2') ? 'ДА' : 'НЕТ'}`);
    console.log(`   TON транзакции: ${transactions?.length || 0}`);

    console.log('\n6️⃣ ДИАГНОЗ ПРОБЛЕМЫ:');
    if (!users || users.length === 0) {
      console.log('🚨 КОРНЕВАЯ ПРИЧИНА: User #25 НЕ СУЩЕСТВУЕТ в текущей БД');
      console.log('🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
      console.log('   1. Анализ ведется в Preview/Development БД вместо Production');
      console.log('   2. User #25 создан в другой БД/окружении');
      console.log('   3. Проблемы с синхронизацией между БД');
      console.log('   4. Неправильная конфигурация Production environment');
    }

    console.log('\n7️⃣ ЦЕПОЧКА ОБНОВЛЕНИЯ БАЛАНСА:');
    console.log('❌ TON депозит → BalanceManager.addBalance() → НЕ НАЙДЕН User #25');
    console.log('❌ WebSocket push → НЕ РАБОТАЕТ для несуществующего User');
    console.log('❌ balanceService.refreshBalance() → 404 Error для User #25');
    console.log('❌ dispatch(SET_BALANCE) → НЕ СРАБАТЫВАЕТ');
    console.log('❌ UI обновление → НЕ ПРОИСХОДИТ');

  } catch (error) {
    console.error('❌ Критическая ошибка диагностики:', error.message);
    console.log('\n🔧 РЕКОМЕНДАЦИИ:');
    console.log('1. Проверить правильность Production environment переменных');
    console.log('2. Убедиться что анализ ведется в Production БД, не Preview');
    console.log('3. Проверить корректность SUPABASE_URL и SUPABASE_KEY для Production');
  }
}

diagnoseProductionUser25();