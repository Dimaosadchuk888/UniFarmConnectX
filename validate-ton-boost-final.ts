/**
 * ФИНАЛЬНАЯ ВАЛИДАЦИЯ TON BOOST
 * Проверка работоспособности системы для User 74
 * БЕЗ изменения кода - только анализ данных
 */

import { supabase } from './core/supabase';

interface BoostPurchase {
  id: number;
  user_id: number;
  boost_package_id: number;
  amount: number;
  payment_method: string;
  created_at: string;
  updated_at: string;
}

interface TonFarmingData {
  user_id: number;
  farming_balance: number;
  farming_rate: number;
  farming_start_timestamp: string;
  farming_last_update: string;
  boost_package_id: number;
}

interface Transaction {
  id: number;
  user_id: number;
  type: string;
  amount_ton: number;
  description: string;
  metadata: any;
  created_at: string;
}

async function validateTonBoostFinal() {
  console.log('🔍 ФИНАЛЬНАЯ ВАЛИДАЦИЯ TON BOOST ДЛЯ USER 74');
  console.log('=' .repeat(60));
  
  const userId = 74;

  // 1. Анализ TON Boost депозитов
  console.log('\n📊 1. АНАЛИЗ ДЕПОЗИТОВ TON BOOST:');
  console.log('-'.repeat(60));
  
  // Получаем все покупки boost пакетов
  const { data: boostPurchases, error: purchasesError } = await supabase
    .from('boost_purchases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (purchasesError) {
    console.error('❌ Ошибка получения покупок:', purchasesError);
    return;
  }

  const tonBoostPurchases = boostPurchases?.filter(p => [2, 3, 4].includes(p.boost_package_id)) || [];
  
  console.log(`📦 Количество TON Boost депозитов: ${tonBoostPurchases.length}`);
  
  let totalDeposits = 0;
  tonBoostPurchases.forEach((purchase, index) => {
    const packageNames: Record<number, string> = {
      2: 'Starter (5 TON)',
      3: 'Standard (10 TON)', 
      4: 'Premium (25 TON)'
    };
    console.log(`  ${index + 1}. ${packageNames[purchase.boost_package_id]} - ${purchase.amount} TON (${new Date(purchase.created_at).toLocaleString()})`);
    totalDeposits += purchase.amount;
  });
  
  console.log(`\n💰 Общая сумма депозитов: ${totalDeposits} TON`);

  // 2. Проверка текущего farming_balance
  console.log('\n📈 2. ПРОВЕРКА FARMING BALANCE:');
  console.log('-'.repeat(60));
  
  const { data: tonFarmingData, error: farmingError } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (farmingError || !tonFarmingData) {
    console.error('❌ Нет данных в ton_farming_data для пользователя');
    return;
  }

  console.log(`🔸 Текущий farming_balance: ${tonFarmingData.farming_balance} TON`);
  console.log(`🔸 Текущий farming_rate: ${tonFarmingData.farming_rate} (${tonFarmingData.farming_rate * 100}% в день)`);
  console.log(`🔸 Активный пакет ID: ${tonFarmingData.boost_package_id}`);
  console.log(`🔸 Начало фарминга: ${new Date(tonFarmingData.farming_start_timestamp).toLocaleString()}`);
  console.log(`🔸 Последнее обновление: ${new Date(tonFarmingData.farming_last_update).toLocaleString()}`);

  // Проверка суммирования
  const balanceMatch = tonFarmingData.farming_balance === totalDeposits;
  console.log(`\n${balanceMatch ? '✅' : '❌'} Farming_balance ${balanceMatch ? 'СООТВЕТСТВУЕТ' : 'НЕ СООТВЕТСТВУЕТ'} сумме депозитов`);
  if (!balanceMatch) {
    console.log(`   Ожидается: ${totalDeposits} TON, Фактически: ${tonFarmingData.farming_balance} TON`);
    console.log(`   Разница: ${totalDeposits - tonFarmingData.farming_balance} TON`);
  }

  // 3. Проверка начислений
  console.log('\n💸 3. ПРОВЕРКА НАЧИСЛЕНИЙ:');
  console.log('-'.repeat(60));

  // Получаем последние транзакции начисления
  const { data: incomeTransactions, error: transError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'FARMING_REWARD')
    .not('metadata', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (transError) {
    console.error('❌ Ошибка получения транзакций:', transError);
    return;
  }

  // Фильтруем TON Boost транзакции
  const tonBoostIncomes = incomeTransactions?.filter(t => 
    t.metadata?.original_type === 'TON_BOOST_INCOME' || 
    t.metadata?.transaction_source === 'ton_boost_scheduler'
  ) || [];

  console.log(`\n📝 Последние 5 начислений TON Boost:`);
  const last5Incomes = tonBoostIncomes.slice(0, 5);
  
  let sumIncomes = 0;
  last5Incomes.forEach((trans, index) => {
    console.log(`  ${index + 1}. +${trans.amount_ton} TON (${new Date(trans.created_at).toLocaleString()})`);
    sumIncomes += parseFloat(trans.amount_ton || '0');
  });

  if (last5Incomes.length > 0) {
    const avgIncome = sumIncomes / last5Incomes.length;
    console.log(`\n📊 Среднее начисление за 5 минут: ${avgIncome.toFixed(6)} TON`);

    // Расчет ожидаемого дохода
    const dailyIncome = tonFarmingData.farming_balance * tonFarmingData.farming_rate;
    const incomePerInterval = dailyIncome / 288; // 288 интервалов по 5 минут в сутках

    console.log(`\n🧮 Расчетные показатели:`);
    console.log(`  • Суточный доход: ${tonFarmingData.farming_balance} × ${tonFarmingData.farming_rate} = ${dailyIncome.toFixed(6)} TON`);
    console.log(`  • Доход за 5 минут: ${dailyIncome.toFixed(6)} ÷ 288 = ${incomePerInterval.toFixed(6)} TON`);

    // Проверка соответствия
    const tolerance = 0.000001; // Погрешность для сравнения
    const incomeMatch = Math.abs(avgIncome - incomePerInterval) < tolerance;
    
    console.log(`\n${incomeMatch ? '✅' : '❌'} Фактические начисления ${incomeMatch ? 'СООТВЕТСТВУЮТ' : 'НЕ СООТВЕТСТВУЮТ'} расчетным`);
    if (!incomeMatch) {
      const difference = ((avgIncome / incomePerInterval - 1) * 100).toFixed(2);
      console.log(`   Отклонение: ${difference}%`);
    }
  } else {
    console.log('\n⚠️  Нет транзакций начисления TON Boost');
  }

  // 4. Проверка стабильности
  console.log('\n🔒 4. ПРОВЕРКА СТАБИЛЬНОСТИ:');
  console.log('-'.repeat(60));

  // Проверка истории farming_balance
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentTransactions, error: recentError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .in('type', ['BOOST_PURCHASE', 'FARMING_REWARD'])
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: true });

  if (!recentError && recentTransactions && recentTransactions.length > 0) {
    console.log(`\n📋 Транзакции за последний час: ${recentTransactions.length}`);
    
    // Проверка metadata
    const brokenMetadata = recentTransactions.filter(t => 
      t.metadata && (
        typeof t.metadata === 'string' ||
        t.metadata === null ||
        JSON.stringify(t.metadata).includes('undefined')
      )
    );

    console.log(`${brokenMetadata.length === 0 ? '✅' : '❌'} Все metadata корректны (нет строк, null, undefined)`);
    
    // Проверка последовательности начислений
    const incomes = recentTransactions.filter(t => 
      t.type === 'FARMING_REWARD' && 
      (t.metadata?.original_type === 'TON_BOOST_INCOME' || t.metadata?.transaction_source === 'ton_boost_scheduler')
    );
    
    if (incomes.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < incomes.length; i++) {
        const interval = new Date(incomes[i].created_at).getTime() - new Date(incomes[i-1].created_at).getTime();
        intervals.push(interval / 1000 / 60); // в минутах
      }
      
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const intervalOk = Math.abs(avgInterval - 5) < 1; // допуск 1 минута
      
      console.log(`${intervalOk ? '✅' : '❌'} Интервалы начислений стабильны (среднее: ${avgInterval.toFixed(1)} мин)`);
    }
  }

  // ФИНАЛЬНЫЙ ВЕРДИКТ
  console.log('\n' + '='.repeat(60));
  console.log('📊 ФИНАЛЬНЫЙ ВЕРДИКТ:');
  console.log('='.repeat(60));
  
  // Проверка доходов
  const avgIncome = last5Incomes.length > 0 ? sumIncomes / last5Incomes.length : 0;
  const incomePerInterval = (tonFarmingData.farming_balance * tonFarmingData.farming_rate) / 288;
  
  // Для проверки метаданных
  let brokenMetadata: any[] = [];
  if (!recentError && recentTransactions) {
    brokenMetadata = recentTransactions.filter(t => 
      t.metadata && (
        typeof t.metadata === 'string' ||
        t.metadata === null ||
        JSON.stringify(t.metadata).includes('undefined')
      )
    );
  }

  const checks = {
    deposits: balanceMatch && tonBoostPurchases.length > 0,
    rate: tonFarmingData.farming_rate > 0,
    incomes: last5Incomes.length > 0 && Math.abs(avgIncome - incomePerInterval) < 0.000001,
    metadata: brokenMetadata.length === 0,
    balance: tonFarmingData.farming_balance > 0
  };

  const allChecks = Object.values(checks).every(v => v);

  console.log(`\n${allChecks ? '✅ СИСТЕМА ГОТОВА К PRODUCTION' : '❌ СИСТЕМА ТРЕБУЕТ ДОРАБОТКИ'}`);
  console.log('\nДетализация проверок:');
  console.log(`  ${checks.deposits ? '✅' : '❌'} Депозиты суммируются корректно`);
  console.log(`  ${checks.rate ? '✅' : '❌'} Процентная ставка установлена`);
  console.log(`  ${checks.incomes ? '✅' : '❌'} Начисления соответствуют расчетам`);
  console.log(`  ${checks.metadata ? '✅' : '❌'} Транзакции без ошибок metadata`);
  console.log(`  ${checks.balance ? '✅' : '❌'} Farming balance сохраняется`);

  if (!allChecks) {
    console.log('\n⚠️  ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
    if (!checks.deposits) console.log('  • Несоответствие суммы депозитов и farming_balance');
    if (!checks.rate) console.log('  • Не установлена процентная ставка');
    if (!checks.incomes) console.log('  • Начисления не соответствуют расчетной ставке');
    if (!checks.metadata) console.log('  • Есть транзакции с некорректными metadata');
    if (!checks.balance) console.log('  • Farming balance равен нулю');
  }

  console.log('\n' + '='.repeat(60));
}

// Запускаем валидацию
validateTonBoostFinal().catch(console.error);