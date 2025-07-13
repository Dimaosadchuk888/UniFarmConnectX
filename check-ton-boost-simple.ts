import { supabase } from './core/supabase.js';

async function checkTonBoostSimple() {
  console.log('=== Проверка TON Boost активности ===\n');

  try {
    // 1. Проверка транзакций TON_BOOST_INCOME за последние 30 минут
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: recentTonBoostTx, error: tonBoostError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_BOOST_INCOME')
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false });

    if (tonBoostError) {
      console.error('Ошибка при получении транзакций:', tonBoostError);
    } else {
      console.log(`📊 Транзакций TON_BOOST_INCOME за последние 30 минут: ${recentTonBoostTx?.length || 0}`);
      
      if (recentTonBoostTx && recentTonBoostTx.length > 0) {
        console.log('\nПоследние транзакции TON_BOOST_INCOME:');
        recentTonBoostTx.forEach(tx => {
          console.log(`- ${tx.created_at}: User ${tx.user_id}, Сумма: ${tx.amount_ton} TON`);
        });
      }
    }

    // 2. Проверка всех транзакций за последние 10 минут
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: allRecentTx, error: allError } = await supabase
      .from('transactions')
      .select('type, created_at, user_id, amount_ton, amount_uni')
      .gte('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false });

    if (!allError && allRecentTx) {
      console.log(`\n📋 Всего транзакций за последние 10 минут: ${allRecentTx.length}`);
      const types = allRecentTx.reduce((acc, tx) => {
        acc[tx.type] = (acc[tx.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('\nТипы транзакций:');
      Object.entries(types).forEach(([type, count]) => {
        console.log(`- ${type}: ${count} транзакций`);
      });
    }

    // 3. Проверка активных пользователей TON Boost
    const { data: activeUsers, error: activeError } = await supabase
      .from('ton_farming_data')
      .select('user_id, boost_package_id, farming_rate')
      .not('boost_package_id', 'is', null);

    if (!activeError && activeUsers) {
      console.log(`\n👥 Активных пользователей TON Boost: ${activeUsers.length}`);
      if (activeUsers.length > 0) {
        console.log('Первые 5 пользователей:');
        activeUsers.slice(0, 5).forEach(u => {
          console.log(`- User ${u.user_id}: package ${u.boost_package_id}, rate ${u.farming_rate}`);
        });
      }
    }

    // 4. Проверка расписания планировщиков
    console.log('\n⏰ Планировщики должны запускаться каждые 5 минут');
    console.log('- UNI Farming Scheduler: обрабатывает доходы от UNI фарминга');
    console.log('- TON Boost Income Scheduler: обрабатывает доходы от TON Boost');
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkTonBoostSimple().catch(console.error);