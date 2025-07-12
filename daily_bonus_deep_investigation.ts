import dotenv from 'dotenv';
import { SupabaseClient } from '@supabase/supabase-js';
dotenv.config();

// Прямое подключение к Supabase для исследования
async function createSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found in environment');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

async function investigateDailyBonus() {
  const supabase = await createSupabaseClient();
  if (!supabase) return;

  console.log('🔍 ГЛУБОКОЕ ИССЛЕДОВАНИЕ DAILY BONUS - USER 74');
  console.log('=' . repeat(60));
  
  // 1. Текущее состояние пользователя
  console.log('\n📊 1. ТЕКУЩЕЕ СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ:');
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', 74)
    .single();
    
  if (userError) {
    console.error('Ошибка получения пользователя:', userError);
    return;
  }
  
  console.log(`  ID: ${user.id}`);
  console.log(`  Telegram ID: ${user.telegram_id}`);
  console.log(`  Баланс UNI: ${user.balance_uni}`);
  console.log(`  Баланс TON: ${user.balance_ton}`);
  console.log(`  Daily Bonus получен: ${user.daily_bonus_claimed_at || 'НИКОГДА'}`);
  
  // 2. Проверка транзакций daily_bonus
  console.log('\n💰 2. ТРАНЗАКЦИИ DAILY BONUS:');
  
  // Проверяем оба варианта типа
  const { data: dailyBonusTx, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .in('type', ['daily_bonus', 'DAILY_BONUS'])
    .order('created_at', { ascending: false });
    
  if (txError) {
    console.error('Ошибка получения транзакций:', txError);
  } else {
    console.log(`  Найдено транзакций: ${dailyBonusTx?.length || 0}`);
    
    if (dailyBonusTx && dailyBonusTx.length > 0) {
      console.log('\n  Последние 5 транзакций:');
      dailyBonusTx.slice(0, 5).forEach(tx => {
        console.log(`    [${tx.created_at}]`);
        console.log(`      ID: ${tx.id}`);
        console.log(`      Тип: ${tx.type}`);
        console.log(`      Сумма UNI: ${tx.amount_uni}`);
        console.log(`      Сумма (amount): ${tx.amount}`);
        console.log(`      Описание: ${tx.description}`);
        console.log(`      Статус: ${tx.status}`);
      });
    }
  }
  
  // 3. Проверка логов daily_bonus_logs
  console.log('\n📝 3. ЛОГИ DAILY BONUS:');
  
  const { data: logs, error: logError } = await supabase
    .from('daily_bonus_logs')
    .select('*')
    .eq('user_id', 74)
    .order('created_at', { ascending: false });
    
  if (logError) {
    console.log(`  ❌ Ошибка получения логов: ${logError.message}`);
    console.log(`  Возможно, таблица не существует`);
  } else {
    console.log(`  Найдено записей: ${logs?.length || 0}`);
    
    if (logs && logs.length > 0) {
      console.log('\n  Последние 3 записи:');
      logs.slice(0, 3).forEach(log => {
        console.log(`    [${log.created_at}]`);
        console.log(`      День: ${log.day_count}`);
        console.log(`      Сумма: ${log.bonus_amount} UNI`);
        console.log(`      Баланс до: ${log.previous_balance}`);
        console.log(`      Баланс после: ${log.new_balance}`);
        console.log(`      Разница: ${log.new_balance - log.previous_balance}`);
      });
    }
  }
  
  // 4. Анализ всех транзакций за последние 48 часов
  console.log('\n📈 4. ВСЕ ТРАНЗАКЦИИ ЗА 48 ЧАСОВ:');
  
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  const { data: allTx, error: allTxError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .gte('created_at', twoDaysAgo.toISOString())
    .order('created_at', { ascending: false });
    
  if (allTxError) {
    console.error('Ошибка получения транзакций:', allTxError);
  } else {
    console.log(`  Всего транзакций: ${allTx?.length || 0}`);
    
    // Группируем по типам
    const txByType: Record<string, number> = {};
    allTx?.forEach(tx => {
      txByType[tx.type] = (txByType[tx.type] || 0) + 1;
    });
    
    console.log('\n  Транзакции по типам:');
    Object.entries(txByType).forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`);
    });
  }
  
  // 5. Проверка на дублирование/race conditions
  console.log('\n🔄 5. ПРОВЕРКА НА ДУБЛИРОВАНИЕ:');
  
  if (dailyBonusTx && dailyBonusTx.length > 1) {
    const grouped: Record<string, typeof dailyBonusTx> = {};
    
    dailyBonusTx.forEach(tx => {
      const date = tx.created_at.split('T')[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(tx);
    });
    
    Object.entries(grouped).forEach(([date, txs]) => {
      if (txs.length > 1) {
        console.log(`  ⚠️  ВНИМАНИЕ! ${date}: ${txs.length} транзакций в один день`);
        txs.forEach(tx => {
          console.log(`    - ${tx.created_at}: ${tx.amount_uni} UNI`);
        });
      }
    });
  } else {
    console.log('  ✅ Дублирование транзакций не обнаружено');
  }
  
  // 6. Финальный анализ
  console.log('\n📊 6. ФИНАЛЬНЫЙ АНАЛИЗ:');
  
  const lastClaim = user.daily_bonus_claimed_at ? new Date(user.daily_bonus_claimed_at) : null;
  const now = new Date();
  const hoursSinceLastClaim = lastClaim ? (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60) : null;
  
  console.log(`  Последний claim: ${lastClaim ? lastClaim.toLocaleString('ru-RU') : 'НИКОГДА'}`);
  console.log(`  Часов с последнего claim: ${hoursSinceLastClaim?.toFixed(1) || 'N/A'}`);
  console.log(`  Можно получить новый: ${!lastClaim || hoursSinceLastClaim! >= 24 ? 'ДА' : 'НЕТ'}`);
  
  // Проверка соответствия транзакций и баланса
  const totalDailyBonusAmount = dailyBonusTx?.reduce((sum, tx) => sum + (tx.amount_uni || 0), 0) || 0;
  console.log(`\n  Сумма всех daily bonus транзакций: ${totalDailyBonusAmount} UNI`);
  
  console.log('\n' + '=' . repeat(60));
  console.log('ИССЛЕДОВАНИЕ ЗАВЕРШЕНО');
}

investigateDailyBonus().catch(console.error);