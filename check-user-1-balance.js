/**
 * Проверка баланса пользователя ID=1 напрямую через Supabase
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Ошибка: отсутствуют переменные SUPABASE_URL или SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser1Balance() {
  try {
    console.log('🔍 Проверка баланса пользователя ID=1...');
    
    // Получаем данные пользователя ID=1
    const { data: user, error } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_uni, balance_ton, uni_farming_active, uni_deposit_amount, uni_farming_balance')
      .eq('id', 1)
      .single();
    
    if (error) {
      console.error('❌ Ошибка запроса:', error.message);
      return;
    }
    
    if (!user) {
      console.log('❌ Пользователь с ID=1 не найден');
      return;
    }
    
    console.log('✅ Данные пользователя ID=1:');
    console.log('   ID:', user.id);
    console.log('   Telegram ID:', user.telegram_id);
    console.log('   Username:', user.username);
    console.log('   UNI Balance:', user.balance_uni);
    console.log('   TON Balance:', user.balance_ton);
    console.log('   UNI Farming Active:', user.uni_farming_active);
    console.log('   UNI Deposit Amount:', user.uni_deposit_amount);
    console.log('   UNI Farming Balance:', user.uni_farming_balance);
    
    // Форматируем балансы как числа
    const balanceData = {
      uniBalance: parseFloat(user.balance_uni?.toString() || "0"),
      tonBalance: parseFloat(user.balance_ton?.toString() || "0"),
      uniFarmingActive: user.uni_farming_active || false,
      uniDepositAmount: parseFloat(user.uni_deposit_amount?.toString() || "0"),
      uniFarmingBalance: parseFloat(user.uni_farming_balance?.toString() || "0")
    };
    
    console.log('\n📊 Обработанные балансы для UI:');
    console.log(JSON.stringify(balanceData, null, 2));
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
  }
}

checkUser1Balance();