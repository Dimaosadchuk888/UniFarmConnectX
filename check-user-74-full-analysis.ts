import { supabase } from './core/supabase.js';

async function checkUser74FullAnalysis() {
  console.log('🔍 ПОЛНЫЙ АНАЛИЗ USER 74 - TON BOOST И БАЛАНСЫ\n');
  console.log('='*60 + '\n');
  
  const userId = 74;
  
  // 1. ПРОВЕРКА ВСЕХ TON BOOST ПАКЕТОВ
  console.log('1️⃣ ВСЕ TON BOOST ПАКЕТЫ USER 74:\n');
  
  // Проверяем историю покупок boost пакетов
  const { data: boostPurchases } = await supabase
    .from('boost_purchases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (boostPurchases && boostPurchases.length > 0) {
    console.log(`✅ Найдено записей в boost_purchases: ${boostPurchases.length}\n`);
    boostPurchases.forEach((purchase, index) => {
      console.log(`Покупка #${index + 1}:`);
      console.log(`- ID: ${purchase.id}`);
      console.log(`- Пакет: ${purchase.package_name} (ID: ${purchase.package_id})`);
      console.log(`- Тип: ${purchase.package_type}`);
      console.log(`- Статус: ${purchase.status}`);
      console.log(`- Дата: ${new Date(purchase.created_at).toLocaleString()}`);
      console.log('');
    });
  } else {
    console.log('❌ Записей в boost_purchases не найдено');
  }
  
  // Проверяем TON farming data
  const { data: tonFarmingData } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId);
    
  console.log(`\n📊 TON Farming Data записи: ${tonFarmingData?.length || 0}`);
  if (tonFarmingData) {
    tonFarmingData.forEach((data, index) => {
      console.log(`\nЗапись #${index + 1}:`);
      console.log(`- Boost активен: ${data.boost_active}`);
      console.log(`- Пакет ID: ${data.boost_package_id}`);
      console.log(`- Истекает: ${data.boost_expires_at || 'Бессрочно'}`);
    });
  }
  
  // 2. АНАЛИЗ РАСХОЖДЕНИЯ БАЛАНСОВ
  console.log('\n' + '='*60);
  console.log('\n2️⃣ АНАЛИЗ РАСХОЖДЕНИЯ БАЛАНСОВ:\n');
  
  // Получаем баланс из БД
  const { data: userFromDB } = await supabase
    .from('users')
    .select('balance_ton, balance_uni')
    .eq('id', userId)
    .single();
    
  console.log('📊 Балансы в базе данных:');
  console.log(`- TON: ${userFromDB?.balance_ton || 0}`);
  console.log(`- UNI: ${userFromDB?.balance_uni || 0}`);
  
  console.log('\n📱 Балансы в UI (из логов):');
  console.log('- TON: 866.163795');
  console.log('- UNI: 1518293.957115');
  
  const tonDiff = 866.163795 - parseFloat(userFromDB?.balance_ton || '0');
  const uniDiff = 1518293.957115 - parseFloat(userFromDB?.balance_uni || '0');
  
  console.log('\n⚠️ Расхождения:');
  console.log(`- TON: ${tonDiff.toFixed(6)} (UI больше на ${tonDiff.toFixed(2)})`);
  console.log(`- UNI: ${uniDiff.toFixed(6)} (UI больше на ${uniDiff.toFixed(2)})`);
  
  // 3. АНАЛИЗ ПОСЛЕДНИХ ТРАНЗАКЦИЙ
  console.log('\n' + '='*60);
  console.log('\n3️⃣ ПОСЛЕДНИЕ ТРАНЗАКЦИИ ДЛЯ ВЫЯВЛЕНИЯ ПРИЧИН:\n');
  
  // Получаем последние транзакции
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (recentTransactions) {
    console.log('Последние 10 транзакций:');
    console.log('-'.repeat(100));
    console.log('Дата'.padEnd(25) + '| Тип'.padEnd(25) + '| UNI'.padEnd(15) + '| TON'.padEnd(15) + '| Статус');
    console.log('-'.repeat(100));
    
    recentTransactions.forEach(tx => {
      const date = new Date(tx.created_at).toLocaleString();
      const type = tx.type + (tx.metadata?.original_type ? ` (${tx.metadata.original_type})` : '');
      const uni = tx.amount_uni ? `+${tx.amount_uni}` : '0';
      const ton = tx.amount_ton ? `+${tx.amount_ton}` : '0';
      
      console.log(
        date.padEnd(25) + '| ' +
        type.padEnd(25) + '| ' +
        uni.padEnd(15) + '| ' +
        ton.padEnd(15) + '| ' +
        tx.status
      );
    });
  }
  
  // 4. ВОЗМОЖНЫЕ ПРИЧИНЫ РАСХОЖДЕНИЯ
  console.log('\n' + '='*60);
  console.log('\n4️⃣ ВОЗМОЖНЫЕ ПРИЧИНЫ РАСХОЖДЕНИЯ:\n');
  
  console.log('1. Кеширование на frontend - UI показывает устаревшие данные');
  console.log('2. Незавершенные транзакции - есть pending транзакции не отраженные в БД');
  console.log('3. WebSocket синхронизация - обновления не доходят до UI');
  console.log('4. Локальные вычисления - UI добавляет ожидаемые начисления до их фактического поступления');
  
  // Проверяем pending транзакции
  const { data: pendingTx } = await supabase
    .from('transactions')
    .select('amount_uni, amount_ton')
    .eq('user_id', userId)
    .eq('status', 'pending');
    
  if (pendingTx && pendingTx.length > 0) {
    let pendingTon = 0;
    let pendingUni = 0;
    
    pendingTx.forEach(tx => {
      pendingTon += parseFloat(tx.amount_ton || '0');
      pendingUni += parseFloat(tx.amount_uni || '0');
    });
    
    console.log(`\n⏳ Найдено pending транзакций: ${pendingTx.length}`);
    console.log(`- Ожидается TON: ${pendingTon.toFixed(6)}`);
    console.log(`- Ожидается UNI: ${pendingUni.toFixed(6)}`);
  } else {
    console.log('\n✅ Pending транзакций не найдено');
  }
}

checkUser74FullAnalysis();