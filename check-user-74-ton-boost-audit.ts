import { supabase } from './core/supabase.js';

async function auditUser74TonBoost() {
  console.log('🔍 ТЕХНИЧЕСКИЙ АУДИТ TON BOOST - USER ID 74\n');
  console.log('='*60 + '\n');
  
  const userId = 74;
  
  // 1. ПРОВЕРКА TON BOOST ДЕПОЗИТОВ
  console.log('1️⃣ TON BOOST ДЕПОЗИТЫ:\n');
  
  // Получаем данные пользователя
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
    
  console.log(`Текущий баланс TON: ${user?.balance_ton || 0}`);
  console.log(`Telegram ID: ${user?.telegram_id}`);
  
  // Проверяем активные TON Boost пакеты
  const { data: tonFarmingData } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId);
    
  if (tonFarmingData && tonFarmingData.length > 0) {
    console.log(`\n✅ Найдено TON Boost записей: ${tonFarmingData.length}`);
    tonFarmingData.forEach((data, index) => {
      console.log(`\nЗапись #${index + 1}:`);
      console.log(`- ID: ${data.id}`);
      console.log(`- Boost активен: ${data.boost_active ? 'ДА' : 'НЕТ'}`);
      console.log(`- Пакет ID: ${data.boost_package_id}`);
      console.log(`- Баланс фарминга: ${data.farming_balance}`);
      console.log(`- Всего заработано: ${data.total_earned}`);
      console.log(`- Последнее обновление: ${new Date(data.farming_last_update).toLocaleString()}`);
    });
  } else {
    console.log('❌ TON Boost депозиты не найдены');
  }
  
  // Проверяем транзакции покупки Boost пакетов
  const { data: boostPurchases } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'BOOST_PURCHASE')
    .order('created_at', { ascending: false });
    
  console.log(`\n📦 Транзакции покупки Boost пакетов: ${boostPurchases?.length || 0}`);
  if (boostPurchases && boostPurchases.length > 0) {
    let totalBoostSpent = 0;
    boostPurchases.forEach(tx => {
      console.log(`- ${new Date(tx.created_at).toLocaleDateString()}: -${tx.amount_ton} TON`);
      totalBoostSpent += parseFloat(tx.amount_ton || '0');
    });
    console.log(`💰 Всего потрачено на Boost: ${totalBoostSpent} TON`);
  }
  
  // 2. ПРОВЕРКА НАЧИСЛЕНИЙ
  console.log('\n' + '='*60);
  console.log('\n2️⃣ НАЧИСЛЕНИЯ ПО TON BOOST:\n');
  
  // Получаем все транзакции начислений
  const { data: farmingRewards } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'FARMING_REWARD')
    .not('metadata->>original_type', 'is', null)
    .order('created_at', { ascending: false });
    
  console.log(`📈 Найдено транзакций начислений TON Boost: ${farmingRewards?.length || 0}`);
  
  if (farmingRewards && farmingRewards.length > 0) {
    let totalEarned = 0;
    let lastReward = null;
    let firstReward = null;
    
    // Анализируем транзакции
    farmingRewards.forEach((tx, index) => {
      if (index === 0) lastReward = tx;
      if (index === farmingRewards.length - 1) firstReward = tx;
      totalEarned += parseFloat(tx.amount_ton || '0');
    });
    
    console.log(`\n💵 Общая сумма начислений: ${totalEarned.toFixed(6)} TON`);
    console.log(`📅 Первое начисление: ${firstReward ? new Date(firstReward.created_at).toLocaleString() : 'Н/Д'}`);
    console.log(`📅 Последнее начисление: ${lastReward ? new Date(lastReward.created_at).toLocaleString() : 'Н/Д'}`);
    
    // Проверяем регулярность начислений
    if (farmingRewards.length > 1) {
      console.log('\n🕐 Анализ регулярности (последние 10 транзакций):');
      for (let i = 0; i < Math.min(9, farmingRewards.length - 1); i++) {
        const current = new Date(farmingRewards[i].created_at);
        const next = new Date(farmingRewards[i + 1].created_at);
        const diffMinutes = (current.getTime() - next.getTime()) / (1000 * 60);
        console.log(`  Интервал ${i+1}: ${diffMinutes.toFixed(1)} минут`);
      }
    }
    
    // Проверяем суммы начислений
    console.log('\n💰 Последние 5 начислений:');
    farmingRewards.slice(0, 5).forEach(tx => {
      console.log(`  ${new Date(tx.created_at).toLocaleString()}: +${tx.amount_ton} TON`);
    });
  }
  
  // 3. ПРОВЕРКА СООТВЕТСТВИЯ
  console.log('\n' + '='*60);
  console.log('\n3️⃣ ПРОВЕРКА КОРРЕКТНОСТИ:\n');
  
  // Рассчитываем ожидаемый доход
  if (user?.balance_ton) {
    const deposit = parseFloat(user.balance_ton);
    const dailyRate = 0.01; // 1% в день
    const fiveMinuteRate = dailyRate / 288;
    const expectedFiveMinuteIncome = deposit * fiveMinuteRate;
    
    console.log(`📊 Расчет ожидаемого дохода:`);
    console.log(`- Текущий депозит: ${deposit.toFixed(6)} TON`);
    console.log(`- Дневная ставка: ${dailyRate * 100}%`);
    console.log(`- Ожидаемый доход за 5 минут: ${expectedFiveMinuteIncome.toFixed(6)} TON`);
    console.log(`- Ожидаемый доход за день: ${(deposit * dailyRate).toFixed(6)} TON`);
    
    // Сравниваем с последним начислением
    if (farmingRewards && farmingRewards.length > 0) {
      const lastAmount = parseFloat(farmingRewards[0].amount_ton || '0');
      const difference = Math.abs(lastAmount - expectedFiveMinuteIncome);
      const percentDiff = (difference / expectedFiveMinuteIncome) * 100;
      
      console.log(`\n🔍 Сравнение с последним начислением:`);
      console.log(`- Фактическое: ${lastAmount.toFixed(6)} TON`);
      console.log(`- Ожидаемое: ${expectedFiveMinuteIncome.toFixed(6)} TON`);
      console.log(`- Разница: ${difference.toFixed(6)} TON (${percentDiff.toFixed(2)}%)`);
      
      if (percentDiff < 1) {
        console.log('✅ Начисления соответствуют ожидаемым');
      } else {
        console.log('⚠️ Обнаружено расхождение в начислениях');
      }
    }
  }
  
  // Проверка дубликатов
  console.log('\n🔄 Проверка на дубликаты:');
  if (farmingRewards && farmingRewards.length > 0) {
    const timestamps = farmingRewards.map(tx => tx.created_at);
    const uniqueTimestamps = new Set(timestamps);
    
    if (timestamps.length === uniqueTimestamps.size) {
      console.log('✅ Дубликаты не обнаружены');
    } else {
      console.log(`❌ Обнаружены дубликаты: ${timestamps.length - uniqueTimestamps.size} записей`);
    }
  }
  
  console.log('\n' + '='*60);
  console.log('\n✅ АУДИТ ЗАВЕРШЕН');
}

auditUser74TonBoost();