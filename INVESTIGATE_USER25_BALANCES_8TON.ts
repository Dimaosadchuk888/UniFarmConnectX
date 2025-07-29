import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function investigateUser25Balances() {
  console.log('\n🔍 РАССЛЕДОВАНИЕ: Откуда берется 8 TON у пользователя 25?');
  console.log('='.repeat(70));

  try {
    // 1. Основные балансы
    const { data: user25, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 25)
      .single();

    if (userError) {
      console.error('❌ Ошибка получения пользователя:', userError);
      return;
    }

    console.log('\n📊 ОСНОВНЫЕ БАЛАНСЫ:');
    console.log(`   TON баланс: ${user25.balance_ton} TON`);
    console.log(`   UNI баланс: ${user25.balance_uni} UNI`);

    // 2. TON Farming данные
    const { data: tonFarmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', '25')
      .single();

    if (tonFarmingData) {
      console.log('\n💰 TON FARMING ДАННЫЕ:');
      console.log(`   Farming баланс: ${tonFarmingData.farming_balance} TON`);
      console.log(`   Farming rate: ${tonFarmingData.farming_rate}`);
      console.log(`   Boost активен: ${tonFarmingData.boost_active}`);
      console.log(`   Package ID: ${tonFarmingData.boost_package_id}`);
      
      // Проверяем равен ли farming_balance 8 TON
      if (parseFloat(tonFarmingData.farming_balance) === 8) {
        console.log('\n🎯 НАЙДЕНО! farming_balance = 8 TON!');
      }
    }

    // 3. TON Boost информация
    console.log('\n🚀 TON BOOST ИНФОРМАЦИЯ:');
    console.log(`   Boost активен: ${user25.ton_boost_active}`);
    console.log(`   Boost пакет: ${user25.ton_boost_package}`);
    console.log(`   Boost rate: ${user25.ton_boost_rate}`);
    console.log(`   TON Farming баланс: ${user25.ton_farming_balance}`);

    // 4. UNI Farming информация  
    console.log('\n🌾 UNI FARMING ИНФОРМАЦИЯ:');
    console.log(`   UNI депозит: ${user25.uni_deposit_amount}`);
    console.log(`   UNI farming баланс: ${user25.uni_farming_balance}`);
    console.log(`   UNI farming активен: ${user25.uni_farming_active}`);

    // 5. Последние транзакции для поиска 8 TON
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .eq('amount', '8')
      .order('created_at', { ascending: false })
      .limit(10);

    if (transactions && transactions.length > 0) {
      console.log('\n📝 ТРАНЗАКЦИИ С СУММОЙ 8:');
      transactions.forEach(tx => {
        console.log(`   ${tx.created_at}: ${tx.type} ${tx.amount} ${tx.currency} (${tx.description})`);
      });
    }

    // 6. Проверяем возможные константы или конфигурации
    console.log('\n🔢 ВОЗМОЖНЫЕ ИСТОЧНИКИ 8 TON:');
    console.log(`   farming_balance = ${tonFarmingData?.farming_balance || 'N/A'}`);
    console.log(`   ton_farming_balance = ${user25.ton_farming_balance || 'N/A'}`);
    
    // Проверяем сумму различных балансов
    const tonBalance = parseFloat(user25.balance_ton || '0');
    const farmingBalance = parseFloat(tonFarmingData?.farming_balance || '0');
    const tonFarmingBalance = parseFloat(user25.ton_farming_balance || '0');
    
    console.log('\n🧮 РАСЧЕТЫ:');
    console.log(`   balance_ton (${tonBalance}) - farming_balance (${farmingBalance}) = ${tonBalance - farmingBalance}`);
    console.log(`   balance_ton (${tonBalance}) - ton_farming_balance (${tonFarmingBalance}) = ${tonBalance - tonFarmingBalance}`);
    
    if (Math.abs((tonBalance - farmingBalance) - 8) < 0.01) {
      console.log('\n🎯 НАЙДЕНО! balance_ton - farming_balance ≈ 8 TON!');
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запускаем расследование
investigateUser25Balances().then(() => {
  console.log('\n✅ Расследование завершено');
  process.exit(0);
}).catch(error => {
  console.error('❌ Ошибка выполнения:', error);
  process.exit(1);
});