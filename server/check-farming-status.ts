import { supabase } from '../core/supabase.js';

async function checkFarmingStatus() {
  console.log('=== ПРОВЕРКА СТАТУСА ФАРМИНГА РЕФЕРАЛОВ ===\n');
  
  try {
    // Проверяем рефералов с активным фармингом
    const { data: referrals, error } = await supabase
      .from('users')
      .select('id, username, uni_farming_active, uni_farming_start_timestamp, uni_deposit_amount')
      .eq('referred_by', 74);
      
    if (error) throw error;
    
    console.log('📊 СТАТУС ФАРМИНГА У РЕФЕРАЛОВ:\n');
    
    let activeCount = 0;
    referrals?.forEach(ref => {
      console.log(`${ref.username} (ID: ${ref.id})`);
      console.log(`- Фарминг активен: ${ref.uni_farming_active ? '✅ ДА' : '❌ НЕТ'}`);
      console.log(`- Депозит: ${ref.uni_deposit_amount?.toLocaleString('ru-RU')} UNI`);
      if (ref.uni_farming_start_timestamp) {
        console.log(`- Начало фарминга: ${new Date(ref.uni_farming_start_timestamp).toLocaleString('ru-RU')}`);
      }
      console.log('');
      
      if (ref.uni_farming_active) activeCount++;
    });
    
    console.log(`\n✅ Активных фармингов: ${activeCount} из ${referrals?.length || 0}`);
    
    // Проверяем последние транзакции фарминга
    console.log('\n⏱️ ПОСЛЕДНИЕ ТРАНЗАКЦИИ ФАРМИНГА:\n');
    
    const { data: lastTx, error: txError } = await supabase
      .from('transactions')
      .select('user_id, amount, created_at')
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'UNI')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (!txError && lastTx) {
      if (lastTx.length > 0) {
        lastTx.forEach((tx, i) => {
          console.log(`${i+1}. User ${tx.user_id}: +${parseFloat(tx.amount).toLocaleString('ru-RU')} UNI`);
          console.log(`   ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
        });
        
        const lastTime = new Date(lastTx[0].created_at);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - lastTime.getTime()) / 60000);
        console.log(`\n⏱️ Последнее начисление: ${diffMinutes} минут назад`);
      } else {
        console.log('❌ Транзакций фарминга не найдено');
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkFarmingStatus();