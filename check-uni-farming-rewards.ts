import { supabase } from './core/supabase';

async function checkUniFarmingRewards() {
  console.log('=== Детальная проверка UNI FARMING_REWARD транзакций ===\n');

  try {
    // Получаем все FARMING_REWARD транзакции для пользователя 74
    const { data: farmingRewards, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка получения транзакций:', error);
      return;
    }

    console.log(`Всего транзакций FARMING_REWARD: ${farmingRewards?.length || 0}`);
    
    // Разделяем на UNI и TON транзакции
    const uniRewards = farmingRewards?.filter(tx => 
      tx.currency === 'UNI' || 
      (tx.amount_uni && parseFloat(tx.amount_uni) > 0) ||
      (tx.description && tx.description.toLowerCase().includes('uni farming'))
    ) || [];
    
    const tonRewards = farmingRewards?.filter(tx => 
      tx.currency === 'TON' || 
      (tx.amount_ton && parseFloat(tx.amount_ton) > 0) ||
      (tx.description && tx.description.toLowerCase().includes('ton boost'))
    ) || [];

    console.log(`\nUNI farming rewards: ${uniRewards.length}`);
    console.log(`TON rewards (boost покупки): ${tonRewards.length}`);

    if (uniRewards.length === 0) {
      console.log('\n⚠️  НЕ НАЙДЕНО транзакций начисления процентов от UNI фарминга!');
      console.log('Это критическая проблема - процентные начисления не создаются.');
      
      // Проверим farming_sessions
      const { data: sessions } = await supabase
        .from('farming_sessions')
        .select('*')
        .eq('user_id', 74)
        .eq('session_type', 'UNI_FARMING')
        .order('created_at', { ascending: false })
        .limit(5);

      console.log(`\nFarming sessions найдено: ${sessions?.length || 0}`);
      if (sessions && sessions.length > 0) {
        console.log('Последние farming sessions:');
        sessions.forEach((s, i) => {
          console.log(`${i+1}. Дата: ${new Date(s.created_at).toLocaleString('ru-RU')}, Доход: ${s.amount_earned} UNI`);
        });
      }
    } else {
      console.log('\n✅ Найдены UNI farming reward транзакции:');
      uniRewards.slice(0, 5).forEach((tx, i) => {
        console.log(`\n${i+1}. ID: ${tx.id}`);
        console.log(`   Сумма: ${tx.amount || tx.amount_uni} UNI`);
        console.log(`   Дата: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
        console.log(`   Описание: ${tx.description}`);
      });
    }

    // Проверим статус планировщика
    console.log('\n\n=== Анализ проблемы ===');
    
    // Проверим последний запуск планировщика через логи
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', 74)
      .single();

    if (user) {
      const now = new Date();
      const farmingStart = new Date(user.uni_farming_start_timestamp);
      const hoursActive = (now.getTime() - farmingStart.getTime()) / (1000 * 60 * 60);
      const expectedIncome = user.uni_deposit_amount * 0.01 * (hoursActive / 24); // 1% в день

      console.log(`\nФарминг активен: ${user.uni_farming_active ? 'Да' : 'Нет'}`);
      console.log(`Депозит: ${user.uni_deposit_amount} UNI`);
      console.log(`Начало фарминга: ${farmingStart.toLocaleString('ru-RU')}`);
      console.log(`Часов активен: ${hoursActive.toFixed(2)}`);
      console.log(`Ожидаемый доход (1% в день): ${expectedIncome.toFixed(2)} UNI`);
      console.log(`Текущий баланс: ${user.balance_uni} UNI`);
      
      // Вычисляем фактический доход
      const actualIncome = user.balance_uni - 1000000; // начальный баланс был 1000000
      console.log(`Фактический доход: ${actualIncome.toFixed(2)} UNI`);
      
      if (actualIncome > 0 && uniRewards.length === 0) {
        console.log('\n❗ КРИТИЧЕСКАЯ ПРОБЛЕМА:');
        console.log('Доход начисляется на баланс, но транзакции FARMING_REWARD не создаются!');
        console.log('Это означает, что планировщик работает, но транзакции не записываются в БД.');
      }
    }

    // Проверим наличие других типов транзакций, которые могут быть связаны с фармингом
    const { data: otherTx } = await supabase
      .from('transactions')
      .select('type, count')
      .eq('user_id', 74)
      .ilike('description', '%farming%');

    console.log('\n\nВсе транзакции со словом "farming" в описании:', otherTx?.length || 0);

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkUniFarmingRewards();