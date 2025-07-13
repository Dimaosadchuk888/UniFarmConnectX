import { supabase } from './core/supabase';

async function investigateUniFarmingProblem2() {
  console.log("=== ИССЛЕДОВАНИЕ ПРОБЛЕМЫ №2: UNI Farming транзакции ===\n");
  
  const userId = 74;
  
  // 1. Проверяем структуру хранения депозитов
  console.log("1. Проверка структуры депозитов:");
  
  // Сначала проверим данные пользователя
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('uni_farming_active, uni_deposit_amount, uni_farming_balance, uni_farming_rate')
    .eq('id', userId)
    .single();
    
  console.log("   Данные из таблицы users:");
  console.log(`   - uni_farming_active: ${userData?.uni_farming_active}`);
  console.log(`   - uni_deposit_amount: ${userData?.uni_deposit_amount}`);
  console.log(`   - uni_farming_balance: ${userData?.uni_farming_balance}`);
  console.log(`   - uni_farming_rate: ${userData?.uni_farming_rate}`);
  
  // Проверим есть ли таблица uni_farming_data
  console.log("\n   Проверка таблицы uni_farming_data:");
  const { data: uniFarmingData, error: error1 } = await supabase
    .from('uni_farming_data')
    .select('*')
    .eq('user_id', userId);
    
  if (error1) {
    console.log(`   - Ошибка или таблица не существует: ${error1.message}`);
  } else if (uniFarmingData && uniFarmingData.length > 0) {
    console.log(`   - Найдено записей: ${uniFarmingData.length}`);
    uniFarmingData.forEach((record: any, index: number) => {
      console.log(`\n   Запись ${index + 1}:`);
      console.log(`   - farming_balance: ${record.farming_balance}`);
      console.log(`   - farming_deposit: ${record.farming_deposit}`);
      console.log(`   - created_at: ${record.created_at}`);
    });
  } else {
    console.log("   - Записей не найдено");
  }
  
  // 2. Проверяем историю депозитов
  console.log("\n\n2. Проверка истории депозитов (FARMING_DEPOSIT):");
  const { data: deposits, error: error2 } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'FARMING_DEPOSIT')
    .eq('currency', 'UNI')
    .order('created_at', { ascending: false });
    
  if (deposits && deposits.length > 0) {
    console.log(`   - Найдено депозитов: ${deposits.length}`);
    let totalDeposit = 0;
    deposits.forEach((deposit: any, index: number) => {
      const amount = Math.abs(deposit.amount_uni || deposit.amount || 0);
      totalDeposit += amount;
      console.log(`\n   Депозит ${index + 1}:`);
      console.log(`   - ID: ${deposit.id}`);
      console.log(`   - Сумма: ${amount} UNI`);
      console.log(`   - Дата: ${deposit.created_at}`);
    });
    console.log(`\n   - Общая сумма депозитов: ${totalDeposit} UNI`);
  } else {
    console.log("   - Депозитов не найдено");
  }
  
  // 3. Проверяем транзакции начисления процентов
  console.log("\n\n3. Проверка транзакций начисления процентов (FARMING_REWARD):");
  const { data: rewards, error: error3 } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'UNI')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (rewards && rewards.length > 0) {
    console.log(`   - Найдено начислений: ${rewards.length} (последние 10)`);
    
    // Анализируем суммы начислений
    const amounts = new Set();
    rewards.forEach((reward: any) => {
      amounts.add(reward.amount_uni || reward.amount);
    });
    
    console.log(`\n   - Уникальных сумм начислений: ${amounts.size}`);
    if (amounts.size === 1) {
      console.log("   ⚠️  ВСЕ НАЧИСЛЕНИЯ ОДИНАКОВЫЕ - возможно начисляется по общей сумме!");
    }
    
    rewards.slice(0, 3).forEach((reward: any, index: number) => {
      console.log(`\n   Начисление ${index + 1}:`);
      console.log(`   - ID: ${reward.id}`);
      console.log(`   - Сумма: ${reward.amount_uni || reward.amount} UNI`);
      console.log(`   - Дата: ${reward.created_at}`);
    });
  } else {
    console.log("   - Начислений не найдено");
  }
  
  // 4. Проверяем farming_sessions
  console.log("\n\n4. Проверка таблицы farming_sessions:");
  const { data: sessions, error: error4 } = await supabase
    .from('farming_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('session_type', 'UNI_FARMING')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (sessions && sessions.length > 0) {
    console.log(`   - Найдено сессий: ${sessions.length}`);
  } else {
    console.log("   - Сессий не найдено");
  }
  
  console.log("\n\n=== ВЫВОДЫ ПО ПРОБЛЕМЕ №2 ===");
  console.log("1. Структура хранения: проверены users и uni_farming_data");
  console.log("2. История депозитов: подсчитана общая сумма");
  console.log("3. Паттерн начислений: проверена уникальность сумм");
  console.log("4. Поддержка множественных пакетов: проверено наличие отдельных записей");
  
  process.exit(0);
}

investigateUniFarmingProblem2().catch(console.error);
