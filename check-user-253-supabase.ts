import { supabase } from './core/supabaseClient';

async function checkUser253() {
  console.log('🔍 ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ ID 253 В SUPABASE');
  console.log('='.repeat(50));

  try {
    // 1. Проверяем существование пользователя 253
    console.log('\n1️⃣ ПОИСК ПОЛЬЗОВАТЕЛЯ ID 253:');
    const { data: user253, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 253)
      .single();

    if (userError) {
      console.log('❌ Пользователь ID 253 не найден:', userError.message);
    } else {
      console.log('✅ Пользователь ID 253 найден:');
      console.log(`   - ID: ${user253.id}`);
      console.log(`   - Telegram ID: ${user253.telegram_id}`);
      console.log(`   - Username: ${user253.username}`);
      console.log(`   - UNI Balance: ${user253.balance_uni}`);
      console.log(`   - TON Balance: ${user253.balance_ton}`);
      console.log(`   - Дата создания: ${user253.created_at}`);
    }

    // 2. Проверяем транзакции пользователя 253 за последние дни
    console.log('\n2️⃣ ТРАНЗАКЦИИ ПОЛЬЗОВАТЕЛЯ 253 ЗА ПОСЛЕДНИЕ 3 ДНЯ:');
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 253)
      .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (txError) {
      console.log('❌ Ошибка получения транзакций:', txError.message);
    } else {
      console.log(`📋 Найдено транзакций: ${transactions?.length || 0}`);
      
      if (transactions && transactions.length > 0) {
        // Группируем по типам
        const txByType: { [key: string]: any[] } = {};
        transactions.forEach(tx => {
          const type = tx.type || tx.transaction_type || 'UNKNOWN';
          if (!txByType[type]) txByType[type] = [];
          txByType[type].push(tx);
        });

        Object.keys(txByType).forEach(type => {
          const txs = txByType[type];
          console.log(`\n   📊 ${type}: ${txs.length} транзакций`);
          txs.slice(0, 3).forEach((tx, idx) => {
            console.log(`      ${idx + 1}. ${tx.created_at}`);
            console.log(`         Amount: ${tx.amount || tx.amount_ton || tx.amount_uni || '0'}`);
            console.log(`         Description: ${tx.description || 'нет описания'}`);
            console.log(`         Status: ${tx.status || 'unknown'}`);
          });
        });

        // Ищем конкретно TON депозиты
        const tonDeposits = transactions.filter(tx => 
          (tx.type && tx.type.includes('DEPOSIT')) ||
          (tx.description && tx.description.toLowerCase().includes('deposit')) ||
          (tx.description && tx.description.toLowerCase().includes('пополнение'))
        );

        if (tonDeposits.length > 0) {
          console.log('\n🎯 TON ДЕПОЗИТЫ:');
          tonDeposits.forEach((tx, idx) => {
            console.log(`   ${idx + 1}. [${tx.created_at}]`);
            console.log(`      Amount TON: ${tx.amount_ton || '0'}`);
            console.log(`      Amount UNI: ${tx.amount_uni || '0'}`);
            console.log(`      Type: ${tx.type || tx.transaction_type}`);
            console.log(`      Description: ${tx.description}`);
            console.log(`      Status: ${tx.status}`);
            console.log('      ---');
          });
        }
      }
    }

    // 3. Проверяем общую статистику по всем пользователям
    console.log('\n3️⃣ ОБЩАЯ СТАТИСТИКА ПО ПОЛЬЗОВАТЕЛЯМ:');
    const { count: totalUsers, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`👥 Всего пользователей в Supabase: ${totalUsers}`);
    }

    // Проверяем диапазон ID
    const { data: minMaxUsers, error: minMaxError } = await supabase
      .from('users')
      .select('id')
      .order('id', { ascending: true })
      .limit(1);

    const { data: maxUsers, error: maxError } = await supabase
      .from('users')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    if (!minMaxError && !maxError && minMaxUsers && maxUsers) {
      console.log(`📊 Диапазон ID: от ${minMaxUsers[0]?.id} до ${maxUsers[0]?.id}`);
    }

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
  }
}

// Запускаем проверку
checkUser253().catch(console.error);