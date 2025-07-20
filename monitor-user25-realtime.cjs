/**
 * МОНИТОРИНГ USER 25 В РЕАЛЬНОМ ВРЕМЕНИ
 * Отслеживание появления нового депозита
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function monitorUser25RealTime() {
  console.log('📡 МОНИТОРИНГ USER 25 В РЕАЛЬНОМ ВРЕМЕНИ');
  console.log('='.repeat(45));
  
  const userId = 25;
  const monitoringInterval = 20000; // 20 секунд
  const maxChecks = 15; // 5 минут мониторинга
  
  let checksCount = 0;
  let previousBalance = null;
  let previousTonTransactionCount = 0;
  let lastTransactionId = null;
  
  console.log(`🔍 Мониторинг User ${userId} (Telegram аккаунт)`);
  console.log(`⏰ Интервал: ${monitoringInterval/1000} сек`);
  console.log(`🎯 Максимум проверок: ${maxChecks}`);
  
  const monitor = setInterval(async () => {
    checksCount++;
    console.log(`\n📊 ПРОВЕРКА #${checksCount} (${new Date().toLocaleTimeString()})`);
    
    try {
      // 1. Получаем текущий баланс
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('balance_ton, balance_uni, last_active')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.log('❌ Ошибка получения баланса User 25:', userError.message);
        return;
      }
      
      const currentTonBalance = parseFloat(user.balance_ton || '0');
      const currentUniBalance = parseFloat(user.balance_uni || '0');
      
      console.log(`💰 Баланс: ${currentTonBalance} TON, ${currentUniBalance.toFixed(2)} UNI`);
      
      // 2. Проверяем TON транзакции
      const { data: tonTransactions, error: txError, count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('currency', 'TON')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!txError) {
        console.log(`📝 Всего TON транзакций: ${count}`);
        
        if (count > previousTonTransactionCount) {
          console.log(`🆕 НОВАЯ TON ТРАНЗАКЦИЯ! Было: ${previousTonTransactionCount}, стало: ${count}`);
          previousTonTransactionCount = count;
          
          // Показываем новую транзакцию
          if (tonTransactions && tonTransactions.length > 0) {
            const latestTx = tonTransactions[0];
            const txTime = new Date(latestTx.created_at);
            const secondsAgo = Math.floor((Date.now() - txTime.getTime()) / 1000);
            
            console.log(`   📄 НОВАЯ: ID ${latestTx.id}, ${latestTx.type}, ${latestTx.amount} TON`);
            console.log(`   📅 Время: ${txTime.toLocaleString()} (${secondsAgo} сек назад)`);
            console.log(`   📝 Описание: ${latestTx.description}`);
            
            // Проверяем это депозит
            if (latestTx.type === 'DEPOSIT' || latestTx.description.includes('deposit') || latestTx.description.includes('пополнение')) {
              console.log(`   🎯 ЭТО ДЕПОЗИТ! Проблема решена!`);
            }
            
            lastTransactionId = latestTx.id;
          }
        } else if (tonTransactions && tonTransactions.length > 0) {
          // Показываем последнюю транзакцию для контекста
          const latestTx = tonTransactions[0];
          if (latestTx.id !== lastTransactionId) {
            console.log(`   📄 Последняя: ${latestTx.type} ${latestTx.amount} TON`);
            lastTransactionId = latestTx.id;
          }
        }
      }
      
      // 3. Сравниваем баланс с предыдущим
      if (previousBalance !== null) {
        const tonBalanceChange = currentTonBalance - previousBalance.ton;
        const uniBalanceChange = currentUniBalance - previousBalance.uni;
        
        if (Math.abs(tonBalanceChange) > 0.001) {
          console.log(`🔄 TON БАЛАНС ИЗМЕНИЛСЯ! ${tonBalanceChange > 0 ? '+' : ''}${tonBalanceChange.toFixed(6)} TON`);
          console.log(`   Было: ${previousBalance.ton} TON`);
          console.log(`   Стало: ${currentTonBalance} TON`);
          
          if (tonBalanceChange > 0) {
            console.log('✅ ПОПОЛНЕНИЕ ОБНАРУЖЕНО!');
            
            // Проверяем есть ли соответствующая транзакция
            if (count === previousTonTransactionCount) {
              console.log('⚠️ БАЛАНС ОБНОВИЛСЯ БЕЗ ТРАНЗАКЦИИ!');
              console.log('   Это указывает на проблему с записью транзакций');
            }
          }
        }
        
        if (Math.abs(uniBalanceChange) > 1) {
          console.log(`📈 UNI баланс: ${uniBalanceChange > 0 ? '+' : ''}${uniBalanceChange.toFixed(2)} UNI`);
        }
        
        if (Math.abs(tonBalanceChange) < 0.001 && Math.abs(uniBalanceChange) < 1) {
          console.log('📊 Балансы стабильны');
        }
      }
      
      previousBalance = {
        ton: currentTonBalance,
        uni: currentUniBalance
      };
      
      // 4. Показываем время последней активности
      if (user.last_active) {
        const lastActiveTime = new Date(user.last_active);
        const minutesAgo = Math.floor((Date.now() - lastActiveTime.getTime()) / 1000 / 60);
        console.log(`👤 Последняя активность: ${minutesAgo} мин назад`);
      }
      
    } catch (error) {
      console.log('❌ Ошибка мониторинга User 25:', error.message);
    }
    
    // Останавливаем после максимального количества проверок
    if (checksCount >= maxChecks) {
      console.log('\n🏁 МОНИТОРИНГ ЗАВЕРШЕН');
      console.log(`Выполнено ${checksCount} проверок за ${(checksCount * monitoringInterval) / 1000 / 60} минут`);
      console.log('\n📋 ИТОГИ:');
      console.log('- Если новый депозит не появился в БД - проблема с backend записью');
      console.log('- Если баланс изменился без транзакции - проблема с синхронизацией');
      console.log('- Если ничего не изменилось - возможно депозит не был выполнен');
      clearInterval(monitor);
    }
  }, monitoringInterval);
  
  // Выполняем первую проверку
  console.log('\n📊 ИНИЦИАЛИЗАЦИЯ...');
  
  // Получаем начальное состояние
  try {
    const { data: initialUser } = await supabase
      .from('users')
      .select('balance_ton, balance_uni')
      .eq('id', userId)
      .single();
    
    const { count: initialCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('currency', 'TON');
    
    if (initialUser) {
      previousBalance = {
        ton: parseFloat(initialUser.balance_ton || '0'),
        uni: parseFloat(initialUser.balance_uni || '0')
      };
      previousTonTransactionCount = initialCount || 0;
      
      console.log(`📊 Начальный TON баланс: ${previousBalance.ton} TON`);
      console.log(`📊 Начальное количество TON транзакций: ${previousTonTransactionCount}`);
    }
  } catch (error) {
    console.log('❌ Ошибка инициализации:', error.message);
  }
}

// Запуск мониторинга
monitorUser25RealTime().catch(console.error);

// Сохраняем процесс живым
process.on('SIGINT', () => {
  console.log('\n🛑 Мониторинг User 25 остановлен');
  process.exit(0);
});