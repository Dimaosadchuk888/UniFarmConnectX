import { supabase } from './core/supabase';

async function checkTodayFarmingStatus() {
  console.log('=== Проверка статуса UNI фарминга сегодня (12.07.2025) ===\n');

  try {
    // Проверяем транзакции за сегодня
    const today = new Date('2025-07-12T00:00:00');
    const tomorrow = new Date('2025-07-13T00:00:00');
    
    const { data: todayRewards, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'UNI')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка:', error);
      return;
    }

    console.log(`Транзакций FARMING_REWARD сегодня: ${todayRewards?.length || 0}`);
    
    if (todayRewards && todayRewards.length > 0) {
      console.log('\nПоследние транзакции сегодня:');
      todayRewards.slice(0, 3).forEach((tx, i) => {
        console.log(`${i+1}. Время: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
        console.log(`   Сумма: ${tx.amount || tx.amount_uni} UNI`);
      });
    } else {
      console.log('\n⚠️  Сегодня транзакции FARMING_REWARD не создавались!');
    }

    // Проверяем последнюю транзакцию любого типа
    const { data: lastReward } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'UNI')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastReward) {
      const lastDate = new Date(lastReward.created_at);
      const hoursSince = (new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60);
      
      console.log('\n\nПоследнее начисление:');
      console.log(`Дата: ${lastDate.toLocaleString('ru-RU')}`);
      console.log(`Часов назад: ${hoursSince.toFixed(1)}`);
      console.log(`Сумма: ${lastReward.amount || lastReward.amount_uni} UNI`);
      
      if (hoursSince > 1) {
        console.log('\n❗ ПРОБЛЕМА: Планировщик не создавал транзакции более часа!');
        console.log('Планировщик должен запускаться каждые 5 минут.');
      }
    }

    // Проверяем farming_sessions за сегодня
    const { data: todaySessions } = await supabase
      .from('farming_sessions')
      .select('*')
      .eq('user_id', 74)
      .eq('session_type', 'UNI_FARMING')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`\n\nFarming sessions сегодня: ${todaySessions?.length || 0}`);
    if (todaySessions && todaySessions.length > 0) {
      console.log('Последние sessions:');
      todaySessions.forEach((s, i) => {
        console.log(`${i+1}. Время: ${new Date(s.created_at).toLocaleString('ru-RU')}, Доход: ${s.amount_earned} UNI`);
      });
    }

    // Проверяем баланс и активность
    const { data: user } = await supabase
      .from('users')
      .select('balance_uni, uni_farming_active, uni_deposit_amount, uni_farming_start_timestamp')
      .eq('id', 74)
      .single();

    if (user) {
      console.log('\n\nТекущий статус пользователя:');
      console.log(`Фарминг активен: ${user.uni_farming_active ? '✅ Да' : '❌ Нет'}`);
      console.log(`Депозит: ${user.uni_deposit_amount} UNI`);
      console.log(`Баланс: ${user.balance_uni} UNI`);
      
      if (!user.uni_farming_active) {
        console.log('\n❌ КРИТИЧНО: Фарминг деактивирован!');
      }
    }

    // Проверяем текущее время и статус workflow
    console.log('\n\nДиагностика:');
    console.log(`Текущее время сервера: ${new Date().toLocaleString('ru-RU')}`);
    console.log('Планировщик должен запускаться каждые 5 минут через workflow.');
    console.log('Если транзакции не создаются - возможно workflow остановлен.');

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkTodayFarmingStatus();