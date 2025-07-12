/**
 * Скрипт для проверки транзакций пользователя 74
 * Проверяет какие типы транзакций существуют и правильно ли они создаются
 */

import { supabase } from './core/supabase';

async function checkUser74Transactions() {
  console.log('=== Проверка транзакций пользователя 74 ===\n');

  try {
    // Получаем последние 20 транзакций
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .order('created_at', { ascending: false })
      .limit(20);

    if (txError) {
      console.error('❌ Ошибка получения транзакций:', txError);
      return;
    }

    console.log(`✅ Найдено транзакций: ${transactions?.length || 0}\n`);

    // Группируем по типам
    const transactionsByType: Record<string, any[]> = {};
    
    if (transactions) {
      for (const tx of transactions) {
        if (!transactionsByType[tx.type]) {
          transactionsByType[tx.type] = [];
        }
        transactionsByType[tx.type].push(tx);
      }
    }

    // Выводим статистику по типам
    console.log('📊 Транзакции по типам:');
    for (const [type, txs] of Object.entries(transactionsByType)) {
      console.log(`\n${type}: ${txs.length} транзакций`);
      
      // Показываем последнюю транзакцию каждого типа
      const lastTx = txs[0];
      console.log(`  Последняя: ${new Date(lastTx.created_at).toLocaleString()}`);
      console.log(`  Сумма: ${lastTx.amount_uni || 0} UNI / ${lastTx.amount_ton || 0} TON`);
      console.log(`  Описание: ${lastTx.description || 'Нет описания'}`);
    }

    // Проверяем наличие FARMING_DEPOSIT транзакций
    console.log('\n🔍 Поиск FARMING_DEPOSIT транзакций:');
    const farmingDeposits = transactions?.filter(tx => 
      tx.type === 'FARMING_DEPOSIT' || 
      tx.type === 'farming_deposit' ||
      tx.description?.toLowerCase().includes('deposit')
    );

    if (farmingDeposits && farmingDeposits.length > 0) {
      console.log(`✅ Найдено ${farmingDeposits.length} депозитных транзакций`);
      for (const deposit of farmingDeposits) {
        console.log(`\n  ID: ${deposit.id}`);
        console.log(`  Тип: ${deposit.type}`);
        console.log(`  Сумма: ${deposit.amount_uni} UNI`);
        console.log(`  Дата: ${new Date(deposit.created_at).toLocaleString()}`);
      }
    } else {
      console.log('❌ FARMING_DEPOSIT транзакции не найдены');
    }

    // Проверяем данные пользователя
    console.log('\n👤 Данные пользователя 74:');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 74)
      .single();

    if (user) {
      console.log(`  Баланс UNI: ${user.balance_uni}`);
      console.log(`  Баланс TON: ${user.balance_ton}`);
      console.log(`  Депозит в фарминге: ${user.uni_deposit_amount} UNI`);
      console.log(`  Фарминг активен: ${user.uni_farming_active ? 'Да' : 'Нет'}`);
      console.log(`  Ставка: ${user.uni_farming_rate} (${(parseFloat(user.uni_farming_rate) * 100).toFixed(0)}% в день)`);
      console.log(`  Начало фарминга: ${user.uni_farming_start_timestamp ? new Date(user.uni_farming_start_timestamp).toLocaleString() : 'Не указано'}`);
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }

  process.exit(0);
}

checkUser74Transactions();