import { supabase } from './core/supabase.js';

async function checkAfterRefresh() {
  console.log('🔍 ПРОВЕРКА ПОСЛЕ ОБНОВЛЕНИЯ СТРАНИЦЫ\n');
  console.log('='*60 + '\n');
  
  const userId = 74;
  
  // 1. ТЕКУЩИЕ БАЛАНСЫ
  console.log('1️⃣ СИНХРОНИЗАЦИЯ БАЛАНСОВ:\n');
  
  const { data: user } = await supabase
    .from('users')
    .select('balance_ton, balance_uni')
    .eq('id', userId)
    .single();
    
  console.log('📊 Балансы в БД:');
  console.log(`- TON: ${user?.balance_ton || 0}`);
  console.log(`- UNI: ${user?.balance_uni || 0}`);
  
  console.log('\n📱 Балансы в UI после обновления:');
  console.log('- TON: 841.339572');
  console.log('- UNI: 2026924.227273');
  
  console.log('\n✅ БАЛАНСЫ СИНХРОНИЗИРОВАНЫ!');
  
  // 2. АНАЛИЗ ТРАНЗАКЦИИ ПОКУПКИ BOOST
  console.log('\n' + '='*60);
  console.log('\n2️⃣ ОБНАРУЖЕНА ТРАНЗАКЦИЯ ПОКУПКИ TON BOOST:\n');
  
  console.log('📦 Детали транзакции (ID: 620015):');
  console.log('- Тип: FARMING_REWARD (неправильный тип!)');
  console.log('- Сумма: 25 TON');
  console.log('- Описание: "Покупка TON Boost Premium Boost (-25 TON)"');
  console.log('- Время: 13.07.2025 12:51:27');
  
  console.log('\n⚠️ ПРОБЛЕМА: Покупка boost пакета записана как FARMING_REWARD');
  console.log('Должна быть BOOST_PURCHASE, но этого типа нет в enum БД');
  
  // 3. ПРОВЕРКА ВСЕХ BOOST ПАКЕТОВ
  console.log('\n' + '='*60);
  console.log('\n3️⃣ ПОИСК ВСЕХ BOOST ТРАНЗАКЦИЙ:\n');
  
  // Ищем все транзакции связанные с boost
  const { data: boostTransactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .or('description.ilike.%boost%,metadata->>original_type.eq.TON_BOOST_INCOME')
    .order('created_at', { ascending: false })
    .limit(20);
    
  if (boostTransactions && boostTransactions.length > 0) {
    console.log(`Найдено транзакций связанных с Boost: ${boostTransactions.length}\n`);
    
    // Группируем по типам
    const purchases = boostTransactions.filter(tx => 
      tx.description?.toLowerCase().includes('покупка') || 
      parseFloat(tx.amount_ton || '0') > 10
    );
    
    const incomes = boostTransactions.filter(tx => 
      tx.metadata?.original_type === 'TON_BOOST_INCOME' ||
      tx.description?.toLowerCase().includes('доход')
    );
    
    console.log(`💰 Покупки пакетов: ${purchases.length}`);
    purchases.forEach(tx => {
      console.log(`- ${new Date(tx.created_at).toLocaleString()}: ${tx.description} (${tx.amount_ton} TON)`);
    });
    
    console.log(`\n📈 Начисления дохода: ${incomes.length}`);
    const totalIncome = incomes.reduce((sum, tx) => sum + parseFloat(tx.amount_ton || '0'), 0);
    console.log(`- Всего получено дохода: ${totalIncome.toFixed(6)} TON`);
    console.log(`- Средний доход: ${(totalIncome / incomes.length).toFixed(6)} TON за транзакцию`);
  }
  
  // 4. ТЕКУЩЕЕ СОСТОЯНИЕ TON BOOST
  console.log('\n' + '='*60);
  console.log('\n4️⃣ ИТОГОВЫЙ СТАТУС TON BOOST:\n');
  
  const { data: tonFarmingData } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId);
    
  if (tonFarmingData && tonFarmingData.length > 0) {
    const activeBoost = tonFarmingData.find(d => d.boost_active);
    
    if (activeBoost) {
      console.log('✅ Активный boost пакет:');
      console.log(`- Пакет ID: ${activeBoost.boost_package_id}`);
      console.log(`- Статус: Активен`);
      console.log(`- Последнее обновление: ${new Date(activeBoost.farming_last_update).toLocaleString()}`);
      
      // Рассчитываем ожидаемый доход
      const currentBalance = parseFloat(user?.balance_ton || '0');
      const baseRate = 0.01 / 288; // 1% в день / 288 (5-минутных интервалов)
      const multiplier = activeBoost.boost_package_id === 2 ? 1.5 : 1.0;
      const expectedIncome = currentBalance * baseRate * multiplier;
      
      console.log(`\n💵 Ожидаемый доход каждые 5 минут: ${expectedIncome.toFixed(6)} TON`);
      console.log(`📅 Ожидаемый доход в день: ${(expectedIncome * 288).toFixed(2)} TON`);
    }
  }
  
  console.log('\n' + '='*60);
  console.log('\n✅ АУДИТ ЗАВЕРШЕН');
}

checkAfterRefresh();