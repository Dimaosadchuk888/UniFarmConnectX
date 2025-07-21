const { createClient } = require('@supabase/supabase-js');

// Используем переменные окружения напрямую
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Переменные окружения не найдены');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPostRestart() {
  console.log('🔍 ВЕРИФИКАЦИЯ ПОСЛЕ ПОВТОРНОГО ПЕРЕЗАПУСКА');
  console.log('=' + '='.repeat(50));
  console.log(`⏰ Время проверки: ${new Date().toLocaleTimeString()}`);
  
  try {
    // Получаем последние 15 транзакций для анализа тренда
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('created_at, amount, user_id, type, currency')
      .order('created_at', { ascending: false })
      .limit(15);

    if (error) {
      console.log('❌ Ошибка:', error.message);
      return;
    }

    console.log('\n📊 ПОСЛЕДНИЕ 15 ТРАНЗАКЦИЙ:');
    transactions.forEach((t, i) => {
      const time = new Date(t.created_at);
      const amount = parseFloat(t.amount);
      console.log(`${i+1}. ${time.toLocaleTimeString()} | User ${t.user_id} | ${amount.toFixed(6)} ${t.currency || 'UNI'} | ${t.type}`);
    });

    // Анализ интервалов между транзакциями
    const intervals = [];
    for (let i = 1; i < Math.min(transactions.length, 10); i++) {
      const prev = new Date(transactions[i-1].created_at);
      const curr = new Date(transactions[i].created_at);
      const diffMs = prev.getTime() - curr.getTime();
      const diffMin = diffMs / (1000 * 60);
      intervals.push(diffMin);
    }

    console.log('\n⏱️ АНАЛИЗ ИНТЕРВАЛОВ:');
    intervals.forEach((interval, i) => {
      const status = interval > 4 ? '✅' : (interval > 2 ? '⚠️' : '❌');
      console.log(`${status} Интервал ${i+1}: ${interval.toFixed(2)} минут`);
    });

    const avgInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
    const maxInterval = intervals.length > 0 ? Math.max(...intervals) : 0;
    const minInterval = intervals.length > 0 ? Math.min(...intervals) : 0;

    console.log(`\n📈 СТАТИСТИКА ИНТЕРВАЛОВ:`);
    console.log(`   Минимальный: ${minInterval.toFixed(2)} минут`);
    console.log(`   Средний: ${avgInterval.toFixed(2)} минут`);
    console.log(`   Максимальный: ${maxInterval.toFixed(2)} минут`);

    // Определение статуса стабилизации
    if (avgInterval > 4.5) {
      console.log('\n🎉 СТАБИЛИЗАЦИЯ ЗАВЕРШЕНА!');
      console.log('   Планировщики работают с правильными интервалами');
      console.log('   Можно выполнять компенсацию User 228');
    } else if (maxInterval > 4) {
      console.log('\n🔄 СТАБИЛИЗАЦИЯ В ПРОЦЕССЕ');
      console.log('   Появились правильные интервалы >4 минут');
      console.log('   Ожидается полная нормализация в ближайшие минуты');
    } else {
      console.log('\n⏳ ПЕРЕХОДНЫЙ ПЕРИОД');
      console.log('   Система все еще использует старые данные');
      console.log('   Новые правильные интервалы появятся вскоре');
    }

    // Проверка текущих балансов User 184 для мониторинга роста
    const { data: user184 } = await supabase
      .from('users')
      .select('balance_uni, balance_ton')
      .eq('id', 184)
      .single();

    if (user184) {
      console.log(`\n👤 USER 184 ТЕКУЩИЙ БАЛАНС:`);
      console.log(`   UNI: ${parseFloat(user184.balance_uni).toFixed(6)}`);
      console.log(`   TON: ${parseFloat(user184.balance_ton).toFixed(6)}`);
      
      const webLogBalance = 177517.667405; // Из webview логов
      const dbBalance = parseFloat(user184.balance_uni);
      const balanceGrowth = dbBalance - webLogBalance;
      
      if (Math.abs(balanceGrowth) < 1) {
        console.log('   ✅ Баланс стабилен - нет аномального роста');
      } else {
        console.log(`   ⚠️ Рост баланса: +${balanceGrowth.toFixed(6)} UNI`);
      }
    }

  } catch (error) {
    console.log('❌ Ошибка верификации:', error.message);
  }
}

verifyPostRestart();