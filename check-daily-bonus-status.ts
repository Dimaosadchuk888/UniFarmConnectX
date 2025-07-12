import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDailyBonusStatus() {
  console.log('🔍 Проверка статуса Daily Bonus для пользователя 74\n');

  // 1. Проверка пользователя
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, telegram_id, balance_uni, balance_ton, daily_bonus_claimed_at')
    .eq('id', 74)
    .single();

  if (userError) {
    console.error('❌ Ошибка получения пользователя:', userError);
    return;
  }

  console.log('👤 Пользователь:');
  console.log(`   ID: ${user.id}`);
  console.log(`   Telegram ID: ${user.telegram_id}`);
  console.log(`   Баланс UNI: ${user.balance_uni}`);
  console.log(`   Баланс TON: ${user.balance_ton}`);
  console.log(`   Последний бонус получен: ${user.daily_bonus_claimed_at || 'Никогда'}\n`);

  // 2. Проверка транзакций daily_bonus
  const { data: bonusTransactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .or('type.eq.daily_bonus,type.eq.DAILY_BONUS')
    .order('created_at', { ascending: false })
    .limit(10);

  if (txError) {
    console.error('❌ Ошибка получения транзакций:', txError);
  } else {
    console.log('💰 Транзакции Daily Bonus:');
    if (bonusTransactions && bonusTransactions.length > 0) {
      bonusTransactions.forEach(tx => {
        console.log(`   [${tx.created_at}] ${tx.type}: +${tx.amount_uni} UNI`);
        console.log(`   Описание: ${tx.description}`);
        console.log(`   ID: ${tx.id}\n`);
      });
    } else {
      console.log('   ❌ Транзакции не найдены!\n');
    }
  }

  // 3. Проверка логов daily_bonus_logs
  const { data: bonusLogs, error: logError } = await supabase
    .from('daily_bonus_logs')
    .select('*')
    .eq('user_id', 74)
    .order('created_at', { ascending: false })
    .limit(5);

  if (logError) {
    console.error('❌ Ошибка получения логов (возможно таблица не существует):', logError.message);
  } else {
    console.log('📝 Логи Daily Bonus:');
    if (bonusLogs && bonusLogs.length > 0) {
      bonusLogs.forEach(log => {
        console.log(`   [${log.created_at}] День ${log.day_count}: +${log.bonus_amount} UNI`);
        console.log(`   Баланс: ${log.previous_balance} → ${log.new_balance}`);
        console.log(`   ID: ${log.id}\n`);
      });
    } else {
      console.log('   ⚠️ Логи не найдены (таблица может быть пустой)\n');
    }
  }

  // 4. Проверка всех транзакций за последние 24 часа
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const { data: recentTransactions, error: recentError } = await supabase
    .from('transactions')
    .select('id, type, amount_uni, created_at, description')
    .eq('user_id', 74)
    .gte('created_at', yesterday.toISOString())
    .order('created_at', { ascending: false });

  if (recentError) {
    console.error('❌ Ошибка получения недавних транзакций:', recentError);
  } else {
    console.log('📊 Все транзакции за последние 24 часа:');
    if (recentTransactions && recentTransactions.length > 0) {
      recentTransactions.forEach(tx => {
        console.log(`   [${tx.created_at}] ${tx.type}: ${tx.amount_uni > 0 ? '+' : ''}${tx.amount_uni} UNI`);
      });
    } else {
      console.log('   Нет транзакций за последние 24 часа');
    }
  }

  console.log('\n✅ Проверка завершена');
}

checkDailyBonusStatus().catch(console.error);