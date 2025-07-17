import { supabase } from '../core/supabase.js';

async function checkFarmingTiming() {
  console.log('=== ДЕТАЛЬНАЯ ПРОВЕРКА ФАРМИНГ НАЧИСЛЕНИЙ ===\n');
  
  const referralIds = [186, 187, 188, 189, 190]; // ID ваших рефералов
  
  try {
    // 1. Проверяем данные фарминга рефералов
    console.log('📊 ДАННЫЕ ФАРМИНГА РЕФЕРАЛОВ:');
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .in('id', referralIds);
      
    if (error) {
      console.error('Ошибка:', error);
      return;
    }
    
    users?.forEach(user => {
      console.log(`\n👤 ${user.username} (ID: ${user.id})`);
      console.log(`   - UNI farming активен: ${user.uni_farming_active ? 'ДА' : 'НЕТ'}`);
      console.log(`   - UNI депозит: ${user.uni_deposit_amount || 0} UNI`);
      console.log(`   - UNI баланс: ${user.balance_uni}`);
      console.log(`   - Ставка: ${user.uni_farming_rate || 0}% в день`);
      console.log(`   - Начало фарминга: ${user.uni_farming_start_timestamp ? new Date(user.uni_farming_start_timestamp).toLocaleString('ru-RU') : 'НЕ УСТАНОВЛЕНО'}`);
      console.log(`   - Последнее обновление: ${user.uni_farming_last_update ? new Date(user.uni_farming_last_update).toLocaleString('ru-RU') : 'НЕ ОБНОВЛЯЛОСЬ'}`);
      
      if (user.uni_farming_last_update) {
        const minutesAgo = Math.floor((Date.now() - new Date(user.uni_farming_last_update).getTime()) / 1000 / 60);
        console.log(`   - Минут с последнего обновления: ${minutesAgo}`);
      }
    });
    
    // 2. Проверяем все транзакции этих пользователей
    console.log('\n\n📈 ВСЕ ТРАНЗАКЦИИ РЕФЕРАЛОВ:');
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .in('user_id', referralIds)
      .order('created_at', { ascending: false });
      
    if (txError) {
      console.error('Ошибка:', txError);
      return;
    }
    
    console.log(`\nВсего транзакций: ${transactions?.length || 0}`);
    
    const txByType = {};
    transactions?.forEach(tx => {
      if (!txByType[tx.type]) txByType[tx.type] = 0;
      txByType[tx.type]++;
    });
    
    console.log('\nТранзакции по типам:');
    Object.entries(txByType).forEach(([type, count]) => {
      console.log(`- ${type}: ${count}`);
    });
    
    // 3. Проверяем последние FARMING_REWARD транзакции в системе
    console.log('\n\n🔄 ПОСЛЕДНИЕ FARMING_REWARD В СИСТЕМЕ:');
    const { data: recentFarming, error: farmError } = await supabase
      .from('transactions')
      .select('user_id, amount, currency, created_at')
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (recentFarming && recentFarming.length > 0) {
      console.log(`\nПоследние ${recentFarming.length} начислений:`);
      recentFarming.forEach(tx => {
        const isReferral = referralIds.includes(tx.user_id);
        const marker = isReferral ? '⭐' : '';
        console.log(`${marker} User ${tx.user_id}: +${tx.amount} ${tx.currency} (${new Date(tx.created_at).toLocaleString('ru-RU')})`);
      });
    } else {
      console.log('❌ Нет недавних FARMING_REWARD транзакций');
    }
    
    // 4. Проверяем uni_farming_data таблицу
    console.log('\n\n📋 ПРОВЕРКА ТАБЛИЦЫ uni_farming_data:');
    const { data: farmingData, error: farmingDataError } = await supabase
      .from('uni_farming_data')
      .select('*')
      .in('user_id', referralIds);
      
    if (farmingDataError) {
      console.log('⚠️ Таблица uni_farming_data не существует или недоступна');
      console.log('   Это может быть причиной проблемы!');
    } else if (farmingData && farmingData.length > 0) {
      console.log(`Найдено записей: ${farmingData.length}`);
      farmingData.forEach(fd => {
        console.log(`- User ${fd.user_id}: депозит ${fd.farming_balance}, ставка ${fd.farming_rate}`);
      });
    } else {
      console.log('❌ Нет данных в uni_farming_data для рефералов');
    }
    
    // 5. Итоговый анализ
    console.log('\n\n🔍 АНАЛИЗ ПРОБЛЕМЫ:');
    const hasActiveDeposits = users?.some(u => u.uni_farming_active && u.uni_deposit_amount > 0);
    const hasOldUpdates = users?.every(u => {
      if (!u.uni_farming_last_update) return true;
      const minutesAgo = (Date.now() - new Date(u.uni_farming_last_update).getTime()) / 1000 / 60;
      return minutesAgo > 10;
    });
    
    if (hasActiveDeposits && hasOldUpdates) {
      console.log('❌ Проблема подтверждена:');
      console.log('   - У рефералов есть активные депозиты');
      console.log('   - Но фарминг не обновляется более 10 минут');
      console.log('   - Планировщик фарминга не обрабатывает этих пользователей');
      console.log('\n💡 Возможные причины:');
      console.log('   1. Планировщик пропускает новых пользователей');
      console.log('   2. Проблема с расчетом времени для новых депозитов');
      console.log('   3. Ошибка в логике начисления');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

checkFarmingTiming();