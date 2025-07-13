import { supabase } from './core/supabase.js';

async function checkDbTransactionEnum() {
  console.log('=== Проверка enum типов транзакций в БД ===\n');

  try {
    // Проверяем типы транзакций через создание и откат
    console.log('Проверка поддерживаемых типов транзакций:\n');
    
    const typesToCheck = [
      'FARMING_REWARD',
      'REFERRAL_REWARD', 
      'MISSION_REWARD',
      'DAILY_BONUS',
      'TON_BOOST_INCOME',
      'farming_income',
      'ton_boost_reward'
    ];

    for (const type of typesToCheck) {
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: 9999, // тестовый ID
          type: type,
          amount: '0.001',
          amount_uni: '0',
          amount_ton: '0.001',
          currency: 'TON',
          status: 'test',
          description: 'Test transaction type'
        });

      if (error) {
        if (error.message.includes('invalid input value for enum')) {
          console.log(`❌ ${type} - НЕ поддерживается`);
        } else {
          console.log(`❓ ${type} - другая ошибка: ${error.message}`);
        }
      } else {
        console.log(`✅ ${type} - поддерживается`);
        // Удаляем тестовую транзакцию
        await supabase
          .from('transactions')
          .delete()
          .eq('user_id', 9999)
          .eq('status', 'test');
      }
    }

    // Проверяем какие транзакции создались за последние 30 минут
    console.log('\n📊 Транзакции за последние 30 минут:');
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: recentTx } = await supabase
      .from('transactions')
      .select('type, count')
      .gte('created_at', thirtyMinutesAgo)
      .order('type');

    if (recentTx) {
      const types = recentTx.reduce((acc, tx) => {
        acc[tx.type] = (acc[tx.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(types).forEach(([type, count]) => {
        console.log(`- ${type}: ${count} транзакций`);
      });
    }

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkDbTransactionEnum().catch(console.error);