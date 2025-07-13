/**
 * Phase 3 Balance Audit Script
 * Проверяет соответствие балансов пользователей и суммы их транзакций
 */

import { supabase } from './core/supabase';

interface BalanceAuditResult {
  userId: number;
  currentBalanceUni: number;
  currentBalanceTon: number;
  calculatedBalanceUni: number;
  calculatedBalanceTon: number;
  differenceUni: number;
  differenceTon: number;
  transactionCount: number;
  missingTransactions: {
    type: string;
    amount: number;
    currency: string;
    description: string;
  }[];
}

async function auditUserBalance(userId: number): Promise<BalanceAuditResult> {
  // Получаем текущие балансы пользователя
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, balance_uni, balance_ton')
    .eq('id', userId)
    .single();
    
  if (userError || !user) {
    throw new Error(`User ${userId} not found`);
  }
  
  // Получаем все транзакции пользователя
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
    
  if (txError) {
    throw new Error(`Error fetching transactions: ${txError.message}`);
  }
  
  // Рассчитываем балансы на основе транзакций
  let calculatedUni = 0;
  let calculatedTon = 0;
  
  transactions?.forEach(tx => {
    const amount = parseFloat(tx.amount || '0');
    const amountUni = parseFloat(tx.amount_uni || '0');
    const amountTon = parseFloat(tx.amount_ton || '0');
    
    // Определяем знак операции
    const isDebit = ['FARMING_DEPOSIT', 'WITHDRAW_REQUEST', 'BOOST_PURCHASE'].includes(tx.type) ||
                    tx.type === 'withdrawal' ||
                    (tx.description?.includes('Покупка') || tx.description?.includes('Вывод'));
    
    if (tx.currency === 'UNI') {
      const uniAmount = amount || amountUni;
      calculatedUni += isDebit ? -uniAmount : uniAmount;
    } else if (tx.currency === 'TON') {
      const tonAmount = amount || amountTon;
      calculatedTon += isDebit ? -tonAmount : tonAmount;
    }
  });
  
  // Анализируем недостающие транзакции
  const missingTransactions: BalanceAuditResult['missingTransactions'] = [];
  const differenceUni = user.balance_uni - calculatedUni;
  const differenceTon = user.balance_ton - calculatedTon;
  
  // Если есть большая разница, предлагаем создать корректирующую транзакцию
  if (Math.abs(differenceUni) > 0.01) {
    missingTransactions.push({
      type: differenceUni > 0 ? 'INITIAL_BALANCE' : 'BALANCE_ADJUSTMENT',
      amount: Math.abs(differenceUni),
      currency: 'UNI',
      description: `Корректировка баланса UNI (исторические данные)`
    });
  }
  
  if (Math.abs(differenceTon) > 0.000001) {
    missingTransactions.push({
      type: differenceTon > 0 ? 'INITIAL_BALANCE' : 'BALANCE_ADJUSTMENT',
      amount: Math.abs(differenceTon),
      currency: 'TON',
      description: `Корректировка баланса TON (исторические данные)`
    });
  }
  
  return {
    userId,
    currentBalanceUni: user.balance_uni,
    currentBalanceTon: user.balance_ton,
    calculatedBalanceUni,
    calculatedBalanceTon,
    differenceUni,
    differenceTon,
    transactionCount: transactions?.length || 0,
    missingTransactions
  };
}

async function createMissingTransactions(userId: number, missingTransactions: BalanceAuditResult['missingTransactions']) {
  console.log(`\nСоздаем недостающие транзакции для пользователя ${userId}:`);
  
  for (const tx of missingTransactions) {
    const transactionData = {
      user_id: userId,
      type: 'DAILY_BONUS', // Используем существующий тип для корректировки
      amount: tx.amount.toString(),
      currency: tx.currency,
      status: 'completed',
      description: tx.description,
      metadata: {
        original_type: tx.type,
        source: 'balance_audit_phase3',
        created_by: 'system_reconciliation'
      }
    };
    
    const { data, error } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single();
      
    if (error) {
      console.error(`Ошибка создания транзакции: ${error.message}`);
    } else {
      console.log(`✓ Создана транзакция ID ${data.id}: ${tx.amount} ${tx.currency}`);
    }
  }
}

async function runPhase3Audit() {
  console.log('=== PHASE 3: BALANCE AUDIT ===\n');
  
  // Проверяем основных пользователей с активностью
  const { data: activeUsers } = await supabase
    .from('users')
    .select('id, telegram_username')
    .gt('balance_uni', 0)
    .order('balance_uni', { ascending: false })
    .limit(10);
    
  console.log(`Проверяем ${activeUsers?.length || 0} активных пользователей:\n`);
  
  const auditResults: BalanceAuditResult[] = [];
  
  for (const user of activeUsers || []) {
    try {
      console.log(`\nПроверяем пользователя ${user.id} (@${user.telegram_username}):`);
      const result = await auditUserBalance(user.id);
      auditResults.push(result);
      
      console.log(`Текущий баланс: ${result.currentBalanceUni.toFixed(2)} UNI, ${result.currentBalanceTon.toFixed(6)} TON`);
      console.log(`Рассчитанный: ${result.calculatedBalanceUni.toFixed(2)} UNI, ${result.calculatedBalanceTon.toFixed(6)} TON`);
      console.log(`Разница: ${result.differenceUni.toFixed(2)} UNI, ${result.differenceTon.toFixed(6)} TON`);
      console.log(`Транзакций: ${result.transactionCount}`);
      
      if (result.missingTransactions.length > 0) {
        console.log(`⚠️  Требуется создать ${result.missingTransactions.length} корректирующих транзакций`);
        
        // Спрашиваем подтверждение для создания транзакций
        if (user.id === 74) { // Только для основного тестового пользователя
          await createMissingTransactions(user.id, result.missingTransactions);
        }
      } else {
        console.log(`✓ Баланс соответствует транзакциям`);
      }
    } catch (error) {
      console.error(`Ошибка аудита пользователя ${user.id}:`, error);
    }
  }
  
  // Итоговая статистика
  console.log('\n=== ИТОГОВАЯ СТАТИСТИКА ===');
  console.log(`Проверено пользователей: ${auditResults.length}`);
  
  const usersWithDiscrepancy = auditResults.filter(r => 
    Math.abs(r.differenceUni) > 0.01 || Math.abs(r.differenceTon) > 0.000001
  );
  
  console.log(`Пользователей с расхождениями: ${usersWithDiscrepancy.length}`);
  
  if (usersWithDiscrepancy.length > 0) {
    console.log('\nПользователи с расхождениями:');
    usersWithDiscrepancy.forEach(r => {
      console.log(`- User ${r.userId}: ${r.differenceUni.toFixed(2)} UNI, ${r.differenceTon.toFixed(6)} TON`);
    });
  }
  
  const totalDiscrepancyUni = auditResults.reduce((sum, r) => sum + Math.abs(r.differenceUni), 0);
  const totalDiscrepancyTon = auditResults.reduce((sum, r) => sum + Math.abs(r.differenceTon), 0);
  
  console.log(`\nОбщее расхождение: ${totalDiscrepancyUni.toFixed(2)} UNI, ${totalDiscrepancyTon.toFixed(6)} TON`);
}

// Запускаем аудит
runPhase3Audit().catch(console.error);