const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.DATABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyStabilization() {
  console.log('🎉 ПРОВЕРКА СТАБИЛИЗАЦИИ СИСТЕМЫ');
  console.log('=' + '='.repeat(40));
  
  try {
    // Получаем последние 10 транзакций
    const { data: transactions } = await supabase
      .from('transactions')
      .select('created_at, amount, user_id, type, currency')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!transactions) return;

    // Анализ интервалов
    const intervals = [];
    for (let i = 1; i < Math.min(transactions.length, 8); i++) {
      const prev = new Date(transactions[i-1].created_at);
      const curr = new Date(transactions[i].created_at);
      const diffMs = prev.getTime() - curr.getTime();
      const diffMin = diffMs / (1000 * 60);
      intervals.push(diffMin);
    }

    console.log('⏱️ ПОСЛЕДНИЕ ИНТЕРВАЛЫ:');
    intervals.forEach((interval, i) => {
      const status = interval >= 4.5 && interval <= 5.5 ? '✅' : 
                    interval >= 3 ? '🟡' : '🔴';
      console.log(`   ${status} ${interval.toFixed(2)} минут`);
    });

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const stableCount = intervals.filter(i => i >= 4.5 && i <= 5.5).length;
    const stabilityPercent = (stableCount / intervals.length) * 100;

    console.log(`\n📊 СТАТИСТИКА СТАБИЛИЗАЦИИ:`);
    console.log(`   Средний интервал: ${avgInterval.toFixed(2)} минут`);
    console.log(`   Стабильных интервалов: ${stableCount}/${intervals.length} (${stabilityPercent.toFixed(0)}%)`);

    if (stabilityPercent >= 80 && avgInterval >= 4.5) {
      console.log('\n🎯 СТАБИЛИЗАЦИЯ ПОДТВЕРЖДЕНА!');
      console.log('✅ Планировщики работают в нормальном режиме');
      console.log('✅ Интервалы соответствуют ожиданиям (5 минут)');
      console.log('✅ Система готова к production использованию');
      
      // Проверяем User 184
      const { data: user184 } = await supabase
        .from('users')
        .select('balance_uni')
        .eq('id', 184)
        .single();
        
      if (user184) {
        console.log(`\n👤 User 184 баланс: ${parseFloat(user184.balance_uni).toFixed(6)} UNI`);
      }
      
    } else {
      console.log('\n⏳ СТАБИЛИЗАЦИЯ В ПРОЦЕССЕ...');
      console.log(`   Нужно ${80 - stabilityPercent.toFixed(0)}% больше стабильных интервалов`);
    }

  } catch (error) {
    console.log('❌ Ошибка проверки:', error.message);
  }
}

verifyStabilization();