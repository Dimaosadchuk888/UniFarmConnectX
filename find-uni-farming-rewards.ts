import { supabase } from './core/supabase';

async function findUniFarmingRewards() {
  console.log('=== Поиск настоящих UNI FARMING_REWARD транзакций ===\n');

  try {
    // 1. Получаем настоящие UNI farming rewards
    const { data: uniFarmingRewards, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .eq('type', 'FARMING_REWARD')
      .or('currency.eq.UNI,amount_uni.gt.0')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Ошибка:', error);
      return;
    }

    console.log(`Найдено UNI FARMING_REWARD транзакций: ${uniFarmingRewards?.length || 0}`);
    
    if (uniFarmingRewards && uniFarmingRewards.length > 0) {
      console.log('\nПоследние UNI farming rewards:');
      uniFarmingRewards.forEach((tx, i) => {
        console.log(`\n${i+1}. ID: ${tx.id}`);
        console.log(`   Дата: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
        console.log(`   type: ${tx.type}`);
        console.log(`   currency: ${tx.currency}`);
        console.log(`   amount: ${tx.amount}`);
        console.log(`   amount_uni: ${tx.amount_uni}`);
        console.log(`   description: ${tx.description}`);
      });
    }

    // 2. Проверяем общее количество транзакций между последним UNI farming и сейчас
    if (uniFarmingRewards && uniFarmingRewards.length > 0) {
      const lastUniFarmingDate = uniFarmingRewards[0].created_at;
      
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', 74)
        .gt('created_at', lastUniFarmingDate);

      console.log(`\nТранзакций после последнего UNI farming reward: ${count}`);
      console.log('Это объясняет, почему они не попадают в первую страницу (limit=20)');
    }

    // 3. Анализ проблемы с типами транзакций
    console.log('\n\n=== Анализ проблемы ===');
    console.log('1. В БД есть два вида FARMING_REWARD транзакций:');
    console.log('   - UNI farming rewards (currency=UNI) - настоящие начисления процентов');
    console.log('   - TON Boost покупки (currency=TON) - неправильно помечены как FARMING_REWARD');
    console.log('\n2. Новые транзакции (депозиты, покупки) вытеснили старые UNI rewards');
    console.log('3. UI показывает только первые 20 транзакций при фильтре UNI');
    console.log('4. Планировщик не работает 32+ часа, новые UNI rewards не создаются');

    // 4. Рекомендации
    console.log('\n\n=== Рекомендации для исправления ===');
    console.log('1. Запустить планировщик для создания новых FARMING_REWARD транзакций');
    console.log('2. Исправить тип транзакций для TON Boost покупок (должен быть BOOST_PURCHASE)');
    console.log('3. Увеличить limit в UI или добавить специальный фильтр для FARMING_REWARD');
    
    // 5. Проверим последнюю страницу с UNI транзакциями
    console.log('\n\n=== Проверка пагинации ===');
    const { data: page2, error: page2Error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .eq('currency', 'UNI')
      .order('created_at', { ascending: false })
      .range(20, 39); // Страница 2

    if (!page2Error && page2) {
      const types = page2.reduce((acc, tx) => {
        acc[tx.type] = (acc[tx.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('Страница 2 (записи 21-40):');
      console.log('Типы транзакций:', types);
      
      const farmingOnPage2 = page2.filter(tx => tx.type === 'FARMING_REWARD');
      if (farmingOnPage2.length > 0) {
        console.log(`\n✅ FARMING_REWARD найдены на странице 2!`);
        console.log(`Первая: ${new Date(farmingOnPage2[0].created_at).toLocaleString('ru-RU')}`);
      }
    }

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

findUniFarmingRewards();