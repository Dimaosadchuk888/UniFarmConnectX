import { supabase } from './core/supabase.js';

async function deepBoostInvestigation() {
  console.log('🔬 ГЛУБОКОЕ ИССЛЕДОВАНИЕ TON BOOST ПАКЕТОВ\n');
  console.log('='*60 + '\n');
  
  const userId = 74;
  
  // 1. Проверяем ВСЕ покупки TON Boost по описанию
  console.log('1️⃣ ВСЕ ПОКУПКИ TON BOOST (по описанию):\n');
  
  const { data: allPurchases, count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .like('description', '%Покупка TON Boost%')
    .order('created_at', { ascending: false });
    
  console.log(`Найдено покупок TON Boost: ${count || 0}\n`);
  
  if (allPurchases && allPurchases.length > 0) {
    // Группируем по типам транзакций
    const typeGroups = new Map<string, number>();
    
    allPurchases.forEach((tx, index) => {
      const type = tx.type || 'UNKNOWN';
      typeGroups.set(type, (typeGroups.get(type) || 0) + 1);
      
      if (index < 5) { // Показываем первые 5
        console.log(`${index + 1}. ID: ${tx.id} | ${new Date(tx.created_at).toLocaleString()}`);
        console.log(`   Тип: ${tx.type} | Сумма: ${tx.amount} ${tx.currency}`);
        console.log(`   ${tx.description}`);
        if (tx.metadata) {
          console.log(`   Metadata: ${JSON.stringify(tx.metadata)}`);
        }
        console.log('');
      }
    });
    
    console.log('Статистика по типам транзакций:');
    typeGroups.forEach((count, type) => {
      console.log(`- ${type}: ${count} транзакций`);
    });
  }
  
  // 2. Проверяем таблицу boost_purchases
  console.log('\n' + '='*60);
  console.log('\n2️⃣ ТАБЛИЦА BOOST_PURCHASES:\n');
  
  const { data: boostPurchases, count: purchaseTableCount } = await supabase
    .from('boost_purchases')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  console.log(`Записей в boost_purchases: ${purchaseTableCount || 0}`);
  
  if (boostPurchases && boostPurchases.length > 0) {
    console.log('\nПоследние покупки из таблицы:');
    boostPurchases.slice(0, 5).forEach((purchase, index) => {
      console.log(`${index + 1}. ID: ${purchase.id} | Пакет: ${purchase.boost_package_id}`);
      console.log(`   Дата: ${new Date(purchase.created_at).toLocaleString()}`);
      console.log(`   Сумма: ${purchase.amount} TON`);
      console.log('');
    });
  } else {
    console.log('⚠️ Таблица boost_purchases пуста или нет записей для пользователя');
  }
  
  // 3. Проверяем историю пакетов в ton_farming_data
  console.log('\n' + '='*60);
  console.log('\n3️⃣ ИСТОРИЯ ПАКЕТОВ В TON_FARMING_DATA:\n');
  
  const { data: allFarmingData } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId.toString());
    
  console.log(`Всего записей в ton_farming_data: ${allFarmingData?.length || 0}`);
  
  if (allFarmingData && allFarmingData.length > 0) {
    console.log('\nВсе записи:');
    allFarmingData.forEach((data, index) => {
      console.log(`${index + 1}. Пакет ID: ${data.boost_package_id}`);
      console.log(`   Активен: ${data.boost_active ? '✅' : '❌'}`);
      console.log(`   Ставка: ${(data.farming_rate * 100).toFixed(1)}% в день`);
      console.log(`   Баланс: ${data.farming_balance} TON`);
      console.log(`   Депозит: ${data.farming_deposit} TON`);
      console.log(`   Начало: ${data.farming_start_timestamp ? new Date(data.farming_start_timestamp).toLocaleString() : 'не указано'}`);
      console.log(`   Обновлено: ${new Date(data.farming_last_update).toLocaleString()}`);
      console.log('');
    });
  }
  
  // 4. Проверяем почему не используется BOOST_PURCHASE
  console.log('\n' + '='*60);
  console.log('\n4️⃣ ДИАГНОСТИКА ИСПОЛЬЗОВАНИЯ ТИПА BOOST_PURCHASE:\n');
  
  // Проверяем последнюю транзакцию покупки
  const lastPurchase = allPurchases?.[0];
  if (lastPurchase) {
    console.log('Последняя покупка TON Boost:');
    console.log(`- Создана: ${new Date(lastPurchase.created_at).toLocaleString()}`);
    console.log(`- Тип транзакции: ${lastPurchase.type}`);
    console.log(`- Ожидаемый тип: BOOST_PURCHASE`);
    
    const timeSinceTypeAdded = Date.now() - new Date('2025-07-13T13:46:00').getTime();
    const minutesSinceTypeAdded = Math.floor(timeSinceTypeAdded / 1000 / 60);
    
    console.log(`\n⏰ Время с момента добавления типа: ${minutesSinceTypeAdded} минут`);
    
    if (lastPurchase.type !== 'BOOST_PURCHASE') {
      console.log('\n❌ Тип BOOST_PURCHASE НЕ используется!');
      console.log('\nВозможные причины:');
      console.log('1. Сервер не перезапущен после добавления типа в БД');
      console.log('2. Код модуля boost/service.ts все еще использует FARMING_REWARD');
      console.log('3. Кеширование типов транзакций на стороне сервера');
    }
  }
  
  // 5. Анализ множественных пакетов
  console.log('\n' + '='*60);
  console.log('\n5️⃣ АНАЛИЗ ПРОБЛЕМЫ С МНОЖЕСТВЕННЫМИ ПАКЕТАМИ:\n');
  
  console.log('📊 Архитектура системы TON Boost:');
  console.log('1. ton_farming_data хранит ОДИН активный пакет на пользователя');
  console.log('2. При покупке нового пакета старый деактивируется');
  console.log('3. Поле boost_package_id перезаписывается новым значением');
  console.log('\n⚠️ ВЫВОД: Система не поддерживает одновременно несколько активных пакетов!');
  console.log('Если вы купили 7 пакетов, активен только последний.');
  
  // Проверяем сумму всех покупок
  const totalSpent = allPurchases?.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0) || 0;
  console.log(`\n💰 Общая сумма потраченная на TON Boost: ${totalSpent} TON`);
  console.log(`📦 Количество покупок: ${count || 0}`);
}

deepBoostInvestigation();