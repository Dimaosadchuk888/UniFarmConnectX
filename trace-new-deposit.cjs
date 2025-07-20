/**
 * ОТСЛЕЖИВАНИЕ НОВОГО ДЕПОЗИТА В РЕАЛЬНОМ ВРЕМЕНИ
 * Поиск последней транзакции и проверка баланса
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function traceNewDeposit() {
  console.log('🔍 ОТСЛЕЖИВАНИЕ НОВОГО TON ДЕПОЗИТА');
  console.log('='.repeat(50));
  
  try {
    // Определяем user_id из логов (User 184 из console.logs)
    const userId = 184;
    
    console.log(`👤 Отслеживаем User ID: ${userId}`);
    
    // 1. Получаем текущий баланс
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('balance_ton, balance_uni, telegram_id')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      console.log('❌ Пользователь не найден:', userError?.message);
      return;
    }
    
    console.log('\n💰 ТЕКУЩИЙ БАЛАНС:');
    console.log(`   TON: ${user.balance_ton}`);
    console.log(`   UNI: ${user.balance_uni}`);
    console.log(`   Telegram ID: ${user.telegram_id}`);
    
    // 2. Находим последние TON транзакции
    const { data: recentTransactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('currency', 'TON')
      .eq('type', 'DEPOSIT')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (txError) {
      console.log('❌ Ошибка получения транзакций:', txError.message);
      return;
    }
    
    console.log(`\n📊 ПОСЛЕДНИЕ TON ДЕПОЗИТЫ (${recentTransactions?.length || 0}):`);
    
    if (recentTransactions && recentTransactions.length > 0) {
      let totalFromTransactions = 0;
      
      recentTransactions.forEach((tx, i) => {
        const time = new Date(tx.created_at);
        const timeAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60); // минуты назад
        
        console.log(`\n   ${i + 1}. ID: ${tx.id}`);
        console.log(`      Сумма: ${tx.amount} TON`);
        console.log(`      Время: ${time.toLocaleString()} (${timeAgo} мин назад)`);
        console.log(`      Статус: ${tx.status}`);
        console.log(`      Описание: ${tx.description}`);
        
        totalFromTransactions += parseFloat(tx.amount || 0);
      });
      
      console.log(`\n💰 СУММАРНО ИЗ ТРАНЗАКЦИЙ: ${totalFromTransactions} TON`);
      console.log(`💰 ФАКТИЧЕСКИЙ БАЛАНС: ${user.balance_ton} TON`);
      
      const diff = parseFloat(user.balance_ton) - totalFromTransactions;
      console.log(`💰 РАЗНИЦА: ${diff} TON`);
      
      if (Math.abs(diff) > 0.001) {
        console.log('⚠️ ОБНАРУЖЕНО НЕСООТВЕТСТВИЕ!');
        
        // Проверим самую свежую транзакцию
        const latestTx = recentTransactions[0];
        const latestTime = new Date(latestTx.created_at);
        const minutesAgo = Math.floor((Date.now() - latestTime.getTime()) / 1000 / 60);
        
        if (minutesAgo < 5) {
          console.log(`🔥 СВЕЖАЯ ТРАНЗАКЦИЯ: ${latestTx.amount} TON (${minutesAgo} мин назад)`);
          console.log('🔍 ВОЗМОЖНАЯ ПРИЧИНА: Баланс еще не обновился после транзакции');
        }
      } else {
        console.log('✅ Баланс соответствует транзакциям');
      }
      
    } else {
      console.log('   ❌ TON депозиты не найдены');
    }
    
    // 3. Проверяем есть ли ожидающие обновления
    console.log('\n🔄 ПРОВЕРКА СИСТЕМНОГО СОСТОЯНИЯ:');
    
    // Проверяем последние логи системы
    const { data: systemLogs, error: logsError } = await supabase
      .from('transactions')
      .select('created_at, user_id, type, status')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!logsError && systemLogs) {
      console.log('   📝 Последние 10 транзакций в системе:');
      systemLogs.forEach((log, i) => {
        const time = new Date(log.created_at);
        const timeAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60);
        console.log(`      ${i + 1}. User ${log.user_id}: ${log.type} (${timeAgo} мин назад)`);
      });
    }
    
    console.log('\n🎯 ДИАГНОСТИКА ЗАВЕРШЕНА');
    console.log('Если баланс не соответствует транзакциям - есть проблема с обновлением');
    
  } catch (error) {
    console.log('❌ Критическая ошибка отслеживания:', error.message);
  }
}

traceNewDeposit().catch(console.error);