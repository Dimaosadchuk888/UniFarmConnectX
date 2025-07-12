import { supabase } from './core/supabase';

async function checkFarmingRewards() {
  console.log('=== Проверка транзакций FARMING_REWARD для пользователя 74 ===\n');

  try {
    // Получаем все транзакции для пользователя 74
    const { data: allTransactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Ошибка получения транзакций:', error);
      return;
    }

    console.log(`Всего транзакций найдено: ${allTransactions?.length || 0}`);
    
    // Группируем транзакции по типам
    const transactionsByType: Record<string, any[]> = {};
    
    allTransactions?.forEach(tx => {
      if (!transactionsByType[tx.type]) {
        transactionsByType[tx.type] = [];
      }
      transactionsByType[tx.type].push(tx);
    });

    console.log('\nТипы транзакций и их количество:');
    Object.entries(transactionsByType).forEach(([type, transactions]) => {
      console.log(`   ${type}: ${transactions.length}`);
    });

    // Проверяем наличие FARMING_REWARD
    const farmingRewards = transactionsByType['FARMING_REWARD'] || [];
    
    if (farmingRewards.length > 0) {
      console.log('\n\n=== Найдены транзакции FARMING_REWARD ===');
      console.log(`Количество: ${farmingRewards.length}`);
      console.log('\nПервые 5 транзакций:');
      
      farmingRewards.slice(0, 5).forEach((tx, index) => {
        console.log(`\n${index + 1}. ID: ${tx.id}`);
        console.log(`   Сумма: ${tx.amount || tx.amount_uni} ${tx.currency || 'UNI'}`);
        console.log(`   Дата: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
        console.log(`   Описание: ${tx.description}`);
        console.log(`   Статус: ${tx.status}`);
      });
    } else {
      console.log('\n\n⚠️  Транзакции типа FARMING_REWARD НЕ НАЙДЕНЫ!');
      console.log('Это может означать, что:');
      console.log('1. Планировщик еще не запускался');
      console.log('2. У пользователя нет активного фарминга');
      console.log('3. Проблема с созданием транзакций в планировщике');
    }

    // Проверим текущий статус фарминга пользователя
    const { data: user } = await supabase
      .from('users')
      .select('balance_uni, uni_farming_active, uni_deposit_amount, uni_farming_start_timestamp')
      .eq('id', 74)
      .single();

    if (user) {
      console.log('\n\n=== Статус фарминга пользователя 74 ===');
      console.log(`Баланс UNI: ${user.balance_uni}`);
      console.log(`Фарминг активен: ${user.uni_farming_active ? 'Да' : 'Нет'}`);
      console.log(`Сумма депозита: ${user.uni_deposit_amount} UNI`);
      console.log(`Начало фарминга: ${user.uni_farming_start_timestamp ? new Date(user.uni_farming_start_timestamp).toLocaleString('ru-RU') : 'Не установлено'}`);
    }

    // Посмотрим последние транзакции с фильтром по валюте UNI
    console.log('\n\n=== Последние 10 UNI транзакций (все типы) ===');
    const uniTransactions = allTransactions?.filter(tx => tx.currency === 'UNI' || tx.amount_uni > 0);
    
    uniTransactions?.slice(0, 10).forEach((tx, index) => {
      console.log(`\n${index + 1}. Тип: ${tx.type} | ID: ${tx.id}`);
      console.log(`   Сумма: ${tx.amount || tx.amount_uni} UNI`);
      console.log(`   Дата: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
    });

  } catch (error) {
    console.error('Ошибка выполнения скрипта:', error);
  }
}

checkFarmingRewards();