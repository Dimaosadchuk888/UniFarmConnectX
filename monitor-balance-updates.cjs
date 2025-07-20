/**
 * МОНИТОРИНГ ОБНОВЛЕНИЙ БАЛАНСА В РЕАЛЬНОМ ВРЕМЕНИ
 * Отслеживание процесса обновления после депозита
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function monitorBalanceUpdates() {
  console.log('📡 МОНИТОРИНГ ОБНОВЛЕНИЙ БАЛАНСА');
  console.log('='.repeat(40));
  
  const userId = 184; // Из логов
  const monitoringInterval = 30000; // 30 секунд
  const maxChecks = 10; // Максимум 5 минут мониторинга
  
  let checksCount = 0;
  let previousBalance = null;
  let previousTransactionCount = 0;
  
  console.log(`🔍 Мониторинг User ${userId}`);
  console.log(`⏰ Интервал: ${monitoringInterval/1000} сек`);
  console.log(`🎯 Максимум проверок: ${maxChecks}`);
  
  const monitor = setInterval(async () => {
    checksCount++;
    console.log(`\n📊 ПРОВЕРКА #${checksCount} (${new Date().toLocaleTimeString()})`);
    
    try {
      // Получаем текущий баланс
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('balance_ton, last_active')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.log('❌ Ошибка получения баланса:', userError.message);
        return;
      }
      
      const currentBalance = parseFloat(user.balance_ton || '0');
      console.log(`💰 Текущий баланс: ${currentBalance} TON`);
      
      // Получаем количество транзакций
      const { data: transactions, error: txError, count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('currency', 'TON')
        .eq('type', 'DEPOSIT');
      
      if (!txError) {
        console.log(`📝 Всего TON депозитов: ${count}`);
        
        if (count > previousTransactionCount) {
          console.log(`🆕 НОВАЯ ТРАНЗАКЦИЯ! Было: ${previousTransactionCount}, стало: ${count}`);
          previousTransactionCount = count;
          
          // Получаем последнюю транзакцию
          const { data: latestTx } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .eq('currency', 'TON')
            .eq('type', 'DEPOSIT')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (latestTx) {
            const txTime = new Date(latestTx.created_at);
            const secondsAgo = Math.floor((Date.now() - txTime.getTime()) / 1000);
            console.log(`   📄 Последняя транзакция: ${latestTx.amount} TON (${secondsAgo} сек назад)`);
          }
        }
      }
      
      // Сравниваем с предыдущим балансом
      if (previousBalance !== null) {
        const balanceChange = currentBalance - previousBalance;
        if (Math.abs(balanceChange) > 0.001) {
          console.log(`🔄 БАЛАНС ИЗМЕНИЛСЯ! Изменение: ${balanceChange > 0 ? '+' : ''}${balanceChange} TON`);
          console.log(`   Было: ${previousBalance} TON`);
          console.log(`   Стало: ${currentBalance} TON`);
          
          if (balanceChange > 0) {
            console.log('✅ ДЕПОЗИТ ЗАЧИСЛЕН НА БАЛАНС!');
          }
        } else {
          console.log('📈 Баланс не изменился');
        }
      }
      
      previousBalance = currentBalance;
      
      // Показываем время последней активности
      if (user.last_active) {
        const lastActiveTime = new Date(user.last_active);
        const minutesAgo = Math.floor((Date.now() - lastActiveTime.getTime()) / 1000 / 60);
        console.log(`👤 Последняя активность: ${minutesAgo} мин назад`);
      }
      
    } catch (error) {
      console.log('❌ Ошибка мониторинга:', error.message);
    }
    
    // Останавливаем после максимального количества проверок
    if (checksCount >= maxChecks) {
      console.log('\n🏁 МОНИТОРИНГ ЗАВЕРШЕН');
      console.log(`Выполнено ${checksCount} проверок за ${(checksCount * monitoringInterval) / 1000 / 60} минут`);
      clearInterval(monitor);
    }
  }, monitoringInterval);
  
  // Делаем первую проверку сразу
  console.log('\n📊 ПЕРВОНАЧАЛЬНАЯ ПРОВЕРКА');
  setTimeout(() => {
    // Запуск первой проверки через 1 секунду
  }, 1000);
}

// Запуск мониторинга
monitorBalanceUpdates().catch(console.error);

// Сохраняем процесс живым
process.on('SIGINT', () => {
  console.log('\n🛑 Мониторинг остановлен пользователем');
  process.exit(0);
});