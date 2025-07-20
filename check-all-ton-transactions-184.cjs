/**
 * ПРОВЕРКА ВСЕХ TON ТРАНЗАКЦИЙ USER 184
 * Включая все типы транзакций, не только DEPOSIT
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllTonTransactions() {
  console.log('🔍 ПОЛНАЯ ПРОВЕРКА TON ТРАНЗАКЦИЙ USER 184');
  console.log('='.repeat(50));
  
  const userId = 184;
  
  try {
    // 1. Текущий баланс
    const { data: user } = await supabase
      .from('users')
      .select('balance_ton, balance_uni, telegram_id')
      .eq('id', userId)
      .single();
    
    console.log('👤 USER 184:');
    console.log(`   TON баланс: ${user.balance_ton}`);
    console.log(`   UNI баланс: ${user.balance_uni}`);
    console.log(`   Telegram ID: ${user.telegram_id}`);
    
    // 2. ВСЕ TON транзакции (любого типа)
    const { data: allTonTx, error: allError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('currency', 'TON')
      .order('created_at', { ascending: false });
    
    console.log(`\n📊 ВСЕ TON ТРАНЗАКЦИИ (${allTonTx?.length || 0}):`);
    
    if (allTonTx && allTonTx.length > 0) {
      let totalBalance = 0;
      const typeCounters = {};
      
      allTonTx.forEach((tx, i) => {
        const time = new Date(tx.created_at);
        const timeAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60);
        const amount = parseFloat(tx.amount || tx.amount_ton || 0);
        
        console.log(`\n   ${i + 1}. ID: ${tx.id}`);
        console.log(`      Тип: ${tx.type}`);
        console.log(`      Сумма: ${amount} TON`);
        console.log(`      Время: ${time.toLocaleString()} (${timeAgo} мин назад)`);
        console.log(`      Описание: ${tx.description}`);
        console.log(`      Статус: ${tx.status}`);
        
        // Подсчитываем баланс
        if (tx.type === 'DEPOSIT' || tx.type === 'FARMING_REWARD' || tx.type === 'REFERRAL_REWARD') {
          totalBalance += amount;
        } else if (tx.type === 'WITHDRAWAL') {
          totalBalance -= amount;
        }
        
        // Счетчик типов
        typeCounters[tx.type] = (typeCounters[tx.type] || 0) + 1;
        
        // Проверяем metadata
        if (tx.metadata) {
          console.log(`      Metadata: ${JSON.stringify(tx.metadata)}`);
        }
      });
      
      console.log(`\n📈 СТАТИСТИКА ТИПОВ:`);
      Object.entries(typeCounters).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} транзакций`);
      });
      
      console.log(`\n💰 РАСЧЕТ БАЛАНСА:`);
      console.log(`   Расчетный баланс из транзакций: ${totalBalance} TON`);
      console.log(`   Фактический баланс в БД: ${user.balance_ton} TON`);
      
      const diff = parseFloat(user.balance_ton) - totalBalance;
      if (Math.abs(diff) > 0.001) {
        console.log(`   ⚠️ НЕСООТВЕТСТВИЕ: ${diff} TON`);
        console.log('   Возможные причины:');
        console.log('   - Баланс обновляется с задержкой');
        console.log('   - Есть системные начисления не через транзакции');
        console.log('   - Проблема синхронизации');
      } else {
        console.log(`   ✅ Баланс соответствует транзакциям`);
      }
      
    } else {
      console.log('   ❌ TON транзакции не найдены');
      console.log(`   🤔 НО баланс ${user.balance_ton} TON есть!`);
      console.log('   Это указывает на проблему с записью транзакций');
    }
    
    // 3. Проверяем последние транзакции в системе для понимания активности
    console.log('\n🔄 ПОСЛЕДНИЕ СИСТЕМНЫЕ ТРАНЗАКЦИИ:');
    const { data: recentSystem } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, currency, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (recentSystem) {
      console.log('   📝 Последние 20 транзакций в системе:');
      recentSystem.forEach((tx, i) => {
        const time = new Date(tx.created_at);
        const timeAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60);
        console.log(`      ${i + 1}. User ${tx.user_id}: ${tx.type} ${tx.amount} ${tx.currency} (${timeAgo} мин назад)`);
      });
    }
    
    // 4. Проверяем есть ли депозиты от User 184 с другими типами
    console.log('\n🔍 ПОИСК ВОЗМОЖНЫХ ДЕПОЗИТОВ ДРУГИХ ТИПОВ:');
    const { data: possibleDeposits } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .or('description.ilike.%deposit%,description.ilike.%пополнение%,description.ilike.%blockchain%')
      .order('created_at', { ascending: false });
    
    if (possibleDeposits && possibleDeposits.length > 0) {
      console.log(`   📄 Найдено ${possibleDeposits.length} возможных депозитов:`);
      possibleDeposits.forEach((tx, i) => {
        console.log(`      ${i + 1}. ${tx.type}: ${tx.amount} ${tx.currency} - ${tx.description}`);
      });
    } else {
      console.log('   ❌ Возможные депозиты не найдены');
    }
    
  } catch (error) {
    console.log('❌ Критическая ошибка:', error.message);
  }
}

checkAllTonTransactions().catch(console.error);