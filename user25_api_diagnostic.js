import { supabase } from './core/supabaseClient.js';

// Эмуляция валидной авторизации для диагностики
const mockAuthData = {
  user: { id: 25 },
  hash: 'test-hash',
  auth_date: Math.floor(Date.now() / 1000)
};

async function diagnoseUser25Direct() {
  console.log('🔍 ПРЯМАЯ ДИАГНОСТИКА USER #25 ЧЕРЕЗ SUPABASE');
  console.log('==============================================');
  
  try {
    // 1. Проверяем баланс User #25
    console.log('\n1. БАЛАНС USER #25:');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, balance_uni, balance_ton, updated_at')
      .eq('id', 25)
      .single();
    
    if (userError) {
      console.log(`❌ Ошибка: ${userError.message}`);
      return;
    }
    
    console.log(`   TON баланс: ${user.balance_ton || 0}`);
    console.log(`   UNI баланс: ${user.balance_uni || 0}`);
    console.log(`   Обновлен: ${user.updated_at}`);
    
    // 2. Все транзакции за 48 часов  
    console.log('\n2. ТРАНЗАКЦИИ ЗА 48 ЧАСОВ:');
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: recentTx, error: recentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .gte('created_at', twoDaysAgo)
      .order('created_at', { ascending: false });
    
    if (recentError) {
      console.log(`❌ Ошибка: ${recentError.message}`);
    } else if (!recentTx || recentTx.length === 0) {
      console.log('   ⚠️ НЕТ ТРАНЗАКЦИЙ за 48 часов!');
    } else {
      console.log(`   ✅ Найдено ${recentTx.length} транзакций:`);
      recentTx.forEach((tx, i) => {
        console.log(`   ${i+1}. ID: ${tx.id} | ${tx.type}`);
        console.log(`      TON: ${tx.amount_ton || 0} | UNI: ${tx.amount_uni || 0}`);
        console.log(`      Статус: ${tx.status} | ${tx.created_at}`);
        console.log(`      Hash: ${tx.tx_hash_unique || 'NULL'}`);
        console.log('      ---');
      });
    }
    
    // 3. TON транзакции за все время
    console.log('\n3. ПОИСК TON ТРАНЗАКЦИЙ:');
    const { data: tonTx, error: tonError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .or('type.eq.TON_DEPOSIT,type.eq.FARMING_REWARD')
      .gt('amount_ton', 0)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (tonError) {
      console.log(`❌ Ошибка: ${tonError.message}`);
    } else if (!tonTx || tonTx.length === 0) {
      console.log('   ⚠️ НЕТ TON транзакций (FARMING_REWARD + TON_DEPOSIT)!');
    } else {
      console.log(`   ✅ Найдено ${tonTx.length} TON транзакций:`);
      tonTx.forEach((tx, i) => {
        console.log(`   ${i+1}. ${tx.amount_ton} TON | ${tx.type} | ${tx.created_at}`);
        console.log(`      ID: ${tx.id} | Описание: ${tx.description || 'Нет'}`);
      });
    }
    
    // 4. Подсчет общих статистик
    console.log('\n4. ОБЩАЯ СТАТИСТИКА ТРАНЗАКЦИЙ:');
    const { data: allTx, error: allError } = await supabase
      .from('transactions')
      .select('type, amount_ton, amount_uni')
      .eq('user_id', 25);
    
    if (!allError && allTx) {
      const stats = {};
      let totalTon = 0;
      let totalUni = 0;
      
      allTx.forEach(tx => {
        if (!stats[tx.type]) stats[tx.type] = 0;
        stats[tx.type]++;
        
        if (tx.amount_ton) totalTon += parseFloat(tx.amount_ton);
        if (tx.amount_uni) totalUni += parseFloat(tx.amount_uni);
      });
      
      console.log(`   Всего транзакций: ${allTx.length}`);
      console.log(`   Всего TON в транзакциях: ${totalTon}`);
      console.log(`   Всего UNI в транзакциях: ${totalUni}`);
      console.log('   По типам:');
      Object.entries(stats).forEach(([type, count]) => {
        console.log(`     ${type}: ${count}`);
      });
    }
    
    console.log('\n✅ Диагностика завершена');
    
  } catch (error) {
    console.log(`💥 КРИТИЧНАЯ ОШИБКА: ${error.message}`);
    console.log(error.stack);
  }
}

// Запуск
diagnoseUser25Direct();