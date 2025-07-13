import { supabase } from './core/supabase.js';

async function investigateBoostPurchase() {
  console.log('🔍 ИССЛЕДОВАНИЕ ПОКУПКИ TON BOOST И ТРАНЗАКЦИЙ\n');
  console.log('='*60 + '\n');
  
  const userId = 74;
  
  // 1. Проверяем последние транзакции пользователя
  console.log('1️⃣ ПОСЛЕДНИЕ ТРАНЗАКЦИИ ПОЛЬЗОВАТЕЛЯ 74:\n');
  
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log(`Найдено ${recentTransactions?.length || 0} последних транзакций:\n`);
  
  // Ищем транзакции связанные с TON Boost
  const boostRelatedTransactions = recentTransactions?.filter(tx => 
    tx.description?.includes('TON Boost') || 
    tx.type === 'BOOST_PURCHASE' ||
    tx.metadata?.original_type === 'BOOST_PURCHASE'
  );
  
  boostRelatedTransactions?.forEach((tx, index) => {
    console.log(`${index + 1}. ID: ${tx.id}`);
    console.log(`   Тип: ${tx.type}`);
    console.log(`   Сумма: ${tx.amount} ${tx.currency}`);
    console.log(`   Описание: ${tx.description}`);
    console.log(`   Дата: ${new Date(tx.created_at).toLocaleString()}`);
    if (tx.metadata) {
      console.log(`   Metadata: ${JSON.stringify(tx.metadata)}`);
    }
    console.log('');
  });
  
  // 2. Проверяем активные TON Boost пакеты
  console.log('='*60);
  console.log('\n2️⃣ АКТИВНЫЕ TON BOOST ПАКЕТЫ:\n');
  
  const { data: tonFarmingData } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId.toString())
    .eq('boost_active', true);
    
  if (tonFarmingData && tonFarmingData.length > 0) {
    console.log(`Найдено активных пакетов: ${tonFarmingData.length}\n`);
    
    tonFarmingData.forEach((farming, index) => {
      console.log(`Пакет ${index + 1}:`);
      console.log(`- ID пакета: ${farming.boost_package_id}`);
      console.log(`- Активен: ${farming.boost_active}`);
      console.log(`- Ставка: ${farming.farming_rate * 100}% в день`);
      console.log(`- Баланс фарминга: ${farming.farming_balance} TON`);
      console.log(`- Последнее обновление: ${new Date(farming.farming_last_update).toLocaleString()}`);
      console.log('');
    });
  } else {
    console.log('❌ Нет активных TON Boost пакетов');
  }
  
  // 3. Анализ транзакций доходов от TON Boost
  console.log('='*60);
  console.log('\n3️⃣ ТРАНЗАКЦИИ ДОХОДОВ TON BOOST:\n');
  
  const { data: incomeTransactions, count: incomeCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .like('description', '%TON Boost доход%')
    .order('created_at', { ascending: false })
    .limit(20);
    
  console.log(`Всего транзакций доходов: ${incomeCount || 0}`);
  
  if (incomeTransactions && incomeTransactions.length > 0) {
    // Группируем по пакетам
    const packageGroups = new Map<string, any[]>();
    
    incomeTransactions.forEach(tx => {
      const match = tx.description?.match(/пакет (\d+)/);
      const packageId = match ? match[1] : 'unknown';
      
      if (!packageGroups.has(packageId)) {
        packageGroups.set(packageId, []);
      }
      packageGroups.get(packageId)?.push(tx);
    });
    
    console.log('\nДоходы сгруппированы по пакетам:');
    packageGroups.forEach((transactions, packageId) => {
      const totalIncome = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
      console.log(`\nПакет ${packageId}: ${transactions.length} транзакций, сумма: ${totalIncome.toFixed(6)} TON`);
      
      // Показываем последние 3 транзакции
      transactions.slice(0, 3).forEach(tx => {
        console.log(`  - ${new Date(tx.created_at).toLocaleString()}: ${tx.amount} TON`);
      });
    });
  }
  
  // 4. Проверка типов транзакций BOOST_PURCHASE
  console.log('\n' + '='*60);
  console.log('\n4️⃣ ПРОВЕРКА ТИПА BOOST_PURCHASE:\n');
  
  const { data: boostPurchases, count: purchaseCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('type', 'BOOST_PURCHASE')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log(`Транзакций с типом BOOST_PURCHASE: ${purchaseCount || 0}`);
  
  if (boostPurchases && boostPurchases.length > 0) {
    console.log('\n✅ НОВЫЙ ТИП ИСПОЛЬЗУЕТСЯ! Последние покупки:');
    boostPurchases.forEach(tx => {
      console.log(`- ${new Date(tx.created_at).toLocaleString()}: ${tx.description}`);
    });
  } else {
    console.log('\n⚠️ Пока нет транзакций с типом BOOST_PURCHASE');
    console.log('Возможные причины:');
    console.log('1. Код еще не обновлен для использования нового типа');
    console.log('2. Сервер требует перезапуска после добавления типа');
    console.log('3. Транзакции все еще создаются с типом FARMING_REWARD');
  }
  
  // 5. Анализ проблемы с количеством транзакций
  console.log('\n' + '='*60);
  console.log('\n5️⃣ АНАЛИЗ ПРОБЛЕМЫ С КОЛИЧЕСТВОМ ТРАНЗАКЦИЙ:\n');
  
  const { data: allBoostPackages } = await supabase
    .from('boost_packages')
    .select('*')
    .order('id');
    
  console.log('Доступные TON Boost пакеты:');
  allBoostPackages?.forEach(pkg => {
    console.log(`- ${pkg.name} (ID: ${pkg.id}): ${pkg.cost} TON, доход ${pkg.daily_rate}% в день`);
  });
  
  console.log('\n💡 ВЫВОД:');
  console.log('При покупке TON Boost создается ОДНА транзакция покупки.');
  console.log('Доходы начисляются отдельными транзакциями каждые 5 минут.');
  console.log('Если у вас 7 депозитов, проверьте:');
  console.log('1. Таблицу ton_farming_data - там должны быть записи о каждом пакете');
  console.log('2. Транзакции доходов - они создаются планировщиком отдельно');
}

investigateBoostPurchase();