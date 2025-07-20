/**
 * НЕПРЕРЫВНЫЙ МОНИТОРИНГ USER 25
 * Каждые 10 секунд проверяем появление новых транзакций
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

let lastTransactionCount = 0;
let lastBalance = 0;

async function continuousMonitorUser25() {
  console.log('⚡ НЕПРЕРЫВНЫЙ МОНИТОРИНГ USER 25 ЗАПУЩЕН');
  console.log('Проверяем каждые 10 секунд...\n');
  
  const userId = 25;
  let checkCount = 0;
  
  const monitor = setInterval(async () => {
    checkCount++;
    
    try {
      // Получаем текущий баланс
      const { data: user } = await supabase
        .from('users')
        .select('balance_ton')
        .eq('id', userId)
        .single();
      
      const currentBalance = parseFloat(user.balance_ton || '0');
      
      // Получаем количество TON транзакций
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('currency', 'TON');
      
      const currentTime = new Date().toLocaleTimeString();
      
      // Проверяем изменения
      if (checkCount === 1) {
        // Первая проверка
        lastTransactionCount = count;
        lastBalance = currentBalance;
        console.log(`${currentTime} - 📊 Начальное состояние: ${currentBalance} TON, ${count} транзакций`);
      } else {
        // Сравниваем с предыдущим состоянием
        const balanceChanged = Math.abs(currentBalance - lastBalance) > 0.001;
        const transactionCountChanged = count !== lastTransactionCount;
        
        if (balanceChanged || transactionCountChanged) {
          console.log(`${currentTime} - 🔄 ИЗМЕНЕНИЕ ОБНАРУЖЕНО!`);
          
          if (balanceChanged) {
            const diff = currentBalance - lastBalance;
            console.log(`   💰 Баланс: ${lastBalance} → ${currentBalance} TON (${diff > 0 ? '+' : ''}${diff})`);
          }
          
          if (transactionCountChanged) {
            const txDiff = count - lastTransactionCount;
            console.log(`   📝 Транзакций: ${lastTransactionCount} → ${count} (+${txDiff})`);
            
            // Получаем новые транзакции
            const { data: newTx } = await supabase
              .from('transactions')
              .select('*')
              .eq('user_id', userId)
              .eq('currency', 'TON')
              .order('created_at', { ascending: false })
              .limit(txDiff);
            
            if (newTx && newTx.length > 0) {
              console.log('   🆕 НОВЫЕ ТРАНЗАКЦИИ:');
              newTx.forEach((tx, i) => {
                console.log(`      ${i + 1}. ${tx.type}: ${tx.amount} TON - ${tx.description}`);
              });
            }
          }
          
          lastBalance = currentBalance;
          lastTransactionCount = count;
        } else {
          console.log(`${currentTime} - ⏳ Нет изменений (${currentBalance} TON, ${count} транзакций)`);
        }
      }
      
      // Останавливаем после 30 проверок (5 минут)
      if (checkCount >= 30) {
        console.log('\n🏁 Мониторинг завершен (5 минут)');
        clearInterval(monitor);
        
        if (lastTransactionCount === count && checkCount > 1) {
          console.log('❌ ЗАКЛЮЧЕНИЕ: Новые транзакции НЕ появились');
          console.log('Проблема подтверждена - frontend/backend рассинхронизация');
        }
      }
      
    } catch (error) {
      console.log(`${new Date().toLocaleTimeString()} - ❌ Ошибка: ${error.message}`);
    }
  }, 10000); // Каждые 10 секунд
}

continuousMonitorUser25().catch(console.error);