const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function diagnoseLiveSchedulers() {
  console.log('🔍 ЖИВАЯ ДИАГНОСТИКА ПЛАНИРОВЩИКОВ');
  console.log('='.repeat(60));
  console.log(`Время проверки: ${new Date().toISOString()}`);
  
  try {
    // Получаем последние 10 транзакций
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.log('❌ Ошибка получения транзакций:', error.message);
      return;
    }

    console.log('\n📊 ПОСЛЕДНИЕ 10 ТРАНЗАКЦИЙ:');
    transactions.forEach((t, i) => {
      const time = new Date(t.created_at);
      const amount = parseFloat(t.amount);
      console.log(`${i+1}. ${time.toLocaleTimeString()} | ${t.type} | ${amount.toFixed(6)} ${t.currency} | User ${t.user_id}`);
    });

    // Анализ интервалов между последними транзакциями
    const intervals = [];
    for (let i = 1; i < transactions.length; i++) {
      const prev = new Date(transactions[i-1].created_at);
      const curr = new Date(transactions[i].created_at);
      const diffMs = prev.getTime() - curr.getTime();
      const diffMin = diffMs / (1000 * 60);
      intervals.push(diffMin);
    }

    console.log('\n⏱️ ИНТЕРВАЛЫ МЕЖДУ ПОСЛЕДНИМИ ТРАНЗАКЦИЯМИ:');
    intervals.forEach((interval, i) => {
      const status = interval > 4 ? '✅' : '❌';
      console.log(`${status} Интервал ${i+1}: ${interval.toFixed(2)} минут`);
    });

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    console.log(`\n📈 СРЕДНИЙ ИНТЕРВАЛ: ${avgInterval.toFixed(2)} минут`);
    
    if (avgInterval < 2) {
      console.log('🚨 АНОМАЛИЯ: Планировщики работают слишком часто!');
      console.log('💡 ПРИЧИНА: Немедленные запуски при старте все еще активны');
    } else {
      console.log('✅ НОРМАЛЬНО: Интервалы соответствуют ожидаемым');
    }

    // Проверяем баланс User 184 в реальном времени
    const { data: user184, error: userError } = await supabase
      .from('users')
      .select('balance_uni, balance_ton')
      .eq('id', 184)
      .single();

    if (!userError && user184) {
      console.log(`\n👤 USER 184 ТЕКУЩИЙ БАЛАНС:`);
      console.log(`   UNI: ${parseFloat(user184.balance_uni).toFixed(6)}`);
      console.log(`   TON: ${parseFloat(user184.balance_ton).toFixed(6)}`);
    }

  } catch (error) {
    console.log('❌ Ошибка диагностики:', error.message);
  }
}

diagnoseLiveSchedulers();