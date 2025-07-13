/**
 * Simplified Phase 3 Balance Audit
 * Проверяет баланс пользователя 74
 */

import { supabase } from './core/supabase';

async function auditUser74() {
  console.log('=== PHASE 3: BALANCE AUDIT FOR USER 74 ===\n');
  
  // Получаем данные пользователя
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', 74)
    .single();
    
  if (userError || !user) {
    console.error('Ошибка получения пользователя:', userError);
    return;
  }
  
  console.log(`Пользователь ${user.id} (@${user.telegram_username}):`);
  console.log(`Текущий баланс: ${user.balance_uni} UNI, ${user.balance_ton} TON\n`);
  
  // Получаем все транзакции
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .order('created_at', { ascending: false });
    
  if (txError) {
    console.error('Ошибка получения транзакций:', txError);
    return;
  }
  
  console.log(`Всего транзакций: ${transactions?.length || 0}\n`);
  
  // Рассчитываем баланс на основе транзакций
  let calculatedUni = 0;
  let calculatedTon = 0;
  let creditUni = 0;
  let debitUni = 0;
  let creditTon = 0;
  let debitTon = 0;
  
  // Группируем транзакции по типам
  const txByType: Record<string, number> = {};
  
  transactions?.forEach(tx => {
    // Считаем количество по типам
    txByType[tx.type] = (txByType[tx.type] || 0) + 1;
    
    // Определяем сумму транзакции
    const amount = parseFloat(tx.amount || '0');
    const amountUni = parseFloat(tx.amount_uni || '0');
    const amountTon = parseFloat(tx.amount_ton || '0');
    
    // Определяем дебет или кредит
    const isDebit = ['FARMING_DEPOSIT', 'WITHDRAW_REQUEST', 'BOOST_PURCHASE'].includes(tx.type) ||
                    tx.type === 'withdrawal' ||
                    (tx.description?.includes('Покупка') || tx.description?.includes('Вывод'));
    
    if (tx.currency === 'UNI') {
      const uniAmount = amount || amountUni;
      if (isDebit) {
        debitUni += uniAmount;
        calculatedUni -= uniAmount;
      } else {
        creditUni += uniAmount;
        calculatedUni += uniAmount;
      }
    } else if (tx.currency === 'TON') {
      const tonAmount = amount || amountTon;
      if (isDebit) {
        debitTon += tonAmount;
        calculatedTon -= tonAmount;
      } else {
        creditTon += tonAmount;
        calculatedTon += tonAmount;
      }
    }
  });
  
  // Выводим статистику по типам транзакций
  console.log('Транзакции по типам:');
  Object.entries(txByType).forEach(([type, count]) => {
    console.log(`- ${type}: ${count}`);
  });
  
  console.log('\nДвижение средств:');
  console.log(`UNI кредит: +${creditUni.toFixed(2)}`);
  console.log(`UNI дебет: -${debitUni.toFixed(2)}`);
  console.log(`TON кредит: +${creditTon.toFixed(6)}`);
  console.log(`TON дебет: -${debitTon.toFixed(6)}`);
  
  console.log('\nРассчитанный баланс:');
  console.log(`UNI: ${calculatedUni.toFixed(2)}`);
  console.log(`TON: ${calculatedTon.toFixed(6)}`);
  
  console.log('\nРазница (текущий - рассчитанный):');
  const diffUni = user.balance_uni - calculatedUni;
  const diffTon = user.balance_ton - calculatedTon;
  console.log(`UNI: ${diffUni.toFixed(2)}`);
  console.log(`TON: ${diffTon.toFixed(6)}`);
  
  // Проверяем последние транзакции
  console.log('\nПоследние 5 транзакций:');
  transactions?.slice(0, 5).forEach(tx => {
    const amount = tx.amount || tx.amount_uni || tx.amount_ton;
    console.log(`- ${tx.type}: ${amount} ${tx.currency} - ${tx.description?.substring(0, 50)}...`);
  });
  
  // Если есть расхождение
  if (Math.abs(diffUni) > 0.01 || Math.abs(diffTon) > 0.000001) {
    console.log('\n⚠️  ОБНАРУЖЕНО РАСХОЖДЕНИЕ!');
    console.log('Возможные причины:');
    console.log('1. Начальный баланс при создании пользователя');
    console.log('2. Корректировки баланса без транзакций');
    console.log('3. Потерянные транзакции');
    
    if (Math.abs(diffUni) > 0.01) {
      console.log(`\nРекомендуется создать корректирующую транзакцию UNI: ${diffUni.toFixed(2)}`);
    }
    if (Math.abs(diffTon) > 0.000001) {
      console.log(`Рекомендуется создать корректирующую транзакцию TON: ${diffTon.toFixed(6)}`);
    }
  } else {
    console.log('\n✅ Баланс полностью соответствует транзакциям!');
  }
}

// Запускаем аудит
auditUser74().catch(console.error);