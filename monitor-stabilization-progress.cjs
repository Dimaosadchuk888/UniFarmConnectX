const { createClient } = require('@supabase/supabase-js');

// Используем переменные окружения
const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Переменные окружения не найдены');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

let previousBalance = null;
let checkCount = 0;

async function monitorStabilization() {
  checkCount++;
  const timestamp = new Date().toLocaleTimeString();
  
  console.log(`\n📊 МОНИТОРИНГ #${checkCount} - ${timestamp}`);
  console.log('=' + '='.repeat(45));
  
  try {
    // Получаем последние 8 транзакций для анализа тренда
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('created_at, amount, user_id, type, currency')
      .order('created_at', { ascending: false })
      .limit(8);

    if (error || !transactions) {
      console.log('❌ Ошибка получения транзакций:', error?.message);
      return;
    }

    // Анализ последних интервалов
    const intervals = [];
    for (let i = 1; i < Math.min(transactions.length, 6); i++) {
      const prev = new Date(transactions[i-1].created_at);
      const curr = new Date(transactions[i].created_at);
      const diffMs = prev.getTime() - curr.getTime();
      const diffMin = diffMs / (1000 * 60);
      intervals.push(diffMin);
    }

    // Показать последние 3 транзакции
    console.log('🔄 ПОСЛЕДНИЕ ТРАНЗАКЦИИ:');
    transactions.slice(0, 3).forEach((t, i) => {
      const time = new Date(t.created_at);
      const amount = parseFloat(t.amount);
      const timeStr = time.toLocaleTimeString();
      console.log(`   ${i+1}. ${timeStr} | User ${t.user_id} | ${amount.toFixed(4)} ${t.currency || 'UNI'}`);
    });

    // Анализ интервалов
    if (intervals.length > 0) {
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const maxInterval = Math.max(...intervals);
      const minInterval = Math.min(...intervals);
      
      console.log('\n⏱️ ИНТЕРВАЛЫ (последние 5):');
      intervals.forEach((interval, i) => {
        const status = interval > 4 ? '✅' : (interval > 2 ? '🟡' : '🔴');
        console.log(`   ${status} ${interval.toFixed(2)} мин`);
      });
      
      console.log(`\n📈 СТАТИСТИКА:`);
      console.log(`   Мин: ${minInterval.toFixed(2)} | Сред: ${avgInterval.toFixed(2)} | Макс: ${maxInterval.toFixed(2)} минут`);
      
      // Определение тренда
      if (avgInterval > 4) {
        console.log('🎉 СТАБИЛИЗАЦИЯ ДОСТИГНУТА! Интервалы нормализовались');
      } else if (maxInterval > 3) {
        console.log('🔄 УЛУЧШЕНИЕ: Появились длинные интервалы');
      } else if (avgInterval > 1) {
        console.log('⏳ ПРОГРЕСС: Интервалы увеличиваются');
      } else {
        console.log('🔴 АНОМАЛИЯ: Интервалы все еще слишком короткие');
      }
    }

    // Проверка баланса User 184
    const { data: user184 } = await supabase
      .from('users')
      .select('balance_uni, balance_ton')
      .eq('id', 184)
      .single();

    if (user184) {
      const currentBalance = parseFloat(user184.balance_uni);
      console.log(`\n👤 USER 184 БАЛАНС: ${currentBalance.toFixed(6)} UNI`);
      
      if (previousBalance !== null) {
        const growth = currentBalance - previousBalance;
        if (Math.abs(growth) > 0.001) {
          const ratePerMin = growth / 1; // За 1 минуту между проверками
          console.log(`   📊 Рост: +${growth.toFixed(6)} UNI (+${ratePerMin.toFixed(6)}/мин)`);
          
          if (growth > 100) {
            console.log('   🚨 АНОМАЛЬНЫЙ РОСТ - планировщики все еще слишком активны');
          } else if (growth > 10) {
            console.log('   ⚠️ УМЕРЕННЫЙ РОСТ - система стабилизируется');
          } else if (growth > 0) {
            console.log('   ✅ НОРМАЛЬНЫЙ РОСТ - интервалы нормализуются');
          } else {
            console.log('   ✅ СТАБИЛЬНО - нет роста баланса');
          }
        } else {
          console.log('   ✅ СТАБИЛЬНО - баланс не изменился');
        }
      }
      previousBalance = currentBalance;
    }

  } catch (error) {
    console.log('❌ Ошибка мониторинга:', error.message);
  }
}

// Запускаем мониторинг каждые 60 секунд
console.log('🔍 ЗАПУСК МОНИТОРИНГА СТАБИЛИЗАЦИИ');
console.log('📋 Отслеживаем динамику интервалов и балансов');
console.log('⏰ Проверка каждые 60 секунд');
console.log('\nДля остановки: Ctrl+C');

monitorStabilization(); // Первая проверка сразу

setInterval(monitorStabilization, 60000); // Каждые 60 секунд