import { supabase } from './core/supabase';

interface SyncReport {
  module: string;
  status: 'SYNCED' | 'ISSUE' | 'WARNING';
  details: string[];
  data?: any;
}

const reports: SyncReport[] = [];

async function checkFullDatabaseSync() {
  console.log('=== ПОЛНАЯ ПРОВЕРКА СИНХРОНИЗАЦИИ БАЗЫ ДАННЫХ UNIFARM ===\n');
  console.log('Время проверки:', new Date().toISOString());
  console.log('=========================================================\n');

  // 1. ПРОВЕРКА ПАРТНЕРСКОЙ ПРОГРАММЫ
  await checkReferralSync();
  
  // 2. ПРОВЕРКА ВЫВОДА СРЕДСТВ
  await checkWithdrawalSync();
  
  // 3. ПРОВЕРКА ДЕПОЗИТОВ
  await checkDepositsSync();
  
  // 4. ПРОВЕРКА БАЛАНСОВ И ТРАНЗАКЦИЙ
  await checkBalanceTransactionSync();
  
  // 5. ФИНАЛЬНЫЙ ОТЧЕТ
  generateFinalReport();
}

// 1. ПАРТНЕРСКАЯ ПРОГРАММА
async function checkReferralSync() {
  console.log('\n📊 1. ПРОВЕРКА ПАРТНЕРСКОЙ ПРОГРАММЫ\n');
  const report: SyncReport = {
    module: 'Партнерская программа',
    status: 'SYNCED',
    details: []
  };

  try {
    // Проверяем реферальные связи
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, ref_code, referred_by, username')
      .not('referred_by', 'is', null);

    if (usersError) throw usersError;

    report.details.push(`✅ Пользователей с рефералами: ${users?.length || 0}`);

    // Проверяем транзакции REFERRAL_REWARD
    const { data: refTransactions, count: refCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('type', 'REFERRAL_REWARD');

    report.details.push(`✅ Транзакций REFERRAL_REWARD: ${refCount || 0}`);

    // Проверяем сумму выплаченных комиссий
    const { data: refSums } = await supabase
      .from('transactions')
      .select('amount_uni, amount_ton, currency')
      .eq('type', 'REFERRAL_REWARD');

    let totalUni = 0, totalTon = 0;
    refSums?.forEach(tx => {
      if (tx.currency === 'UNI') totalUni += parseFloat(tx.amount_uni || 0);
      if (tx.currency === 'TON') totalTon += parseFloat(tx.amount_ton || 0);
    });

    report.details.push(`✅ Выплачено комиссий: ${totalUni.toFixed(6)} UNI, ${totalTon.toFixed(6)} TON`);

    // Проверяем целостность реферальных цепочек
    const referrerIds = new Set(users?.map(u => u.referred_by).filter(id => id !== null));
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id')
      .in('id', Array.from(referrerIds));

    const existingIds = new Set(existingUsers?.map(u => u.id));
    const missingReferrers = Array.from(referrerIds).filter(id => !existingIds.has(id));

    if (missingReferrers.length > 0) {
      report.status = 'ISSUE';
      report.details.push(`❌ Найдены несуществующие рефереры: ${missingReferrers.join(', ')}`);
    } else {
      report.details.push('✅ Все реферальные связи целостны');
    }

  } catch (error) {
    report.status = 'ISSUE';
    report.details.push(`❌ Ошибка проверки: ${error}`);
  }

  reports.push(report);
  report.details.forEach(d => console.log(d));
}

// 2. ВЫВОД СРЕДСТВ
async function checkWithdrawalSync() {
  console.log('\n💸 2. ПРОВЕРКА ВЫВОДА СРЕДСТВ\n');
  const report: SyncReport = {
    module: 'Вывод средств',
    status: 'SYNCED',
    details: []
  };

  try {
    // Проверяем таблицу withdraw_requests
    const { data: withdrawals, count: withdrawCount } = await supabase
      .from('withdraw_requests')
      .select('*', { count: 'exact' });

    report.details.push(`✅ Заявок на вывод: ${withdrawCount || 0}`);

    if (withdrawals && withdrawals.length > 0) {
      // Группируем по статусам
      const statusCounts = withdrawals.reduce((acc: any, w) => {
        acc[w.status] = (acc[w.status] || 0) + 1;
        return acc;
      }, {});

      Object.entries(statusCounts).forEach(([status, count]) => {
        report.details.push(`  - ${status}: ${count} заявок`);
      });

      // Проверяем суммы выводов
      let totalTonWithdraw = 0;
      withdrawals.forEach(w => {
        if (w.amount_ton) totalTonWithdraw += parseFloat(w.amount_ton);
      });

      report.details.push(`✅ Сумма выводов TON: ${totalTonWithdraw.toFixed(6)}`);

      // Проверяем, есть ли транзакции для выводов
      const { data: withdrawTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'WITHDRAW');

      report.details.push(`✅ Транзакций WITHDRAW: ${withdrawTx?.length || 0}`);

      // Проверяем соответствие pending выводов и балансов
      const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
      if (pendingWithdrawals.length > 0) {
        report.details.push(`⚠️ Есть ${pendingWithdrawals.length} заявок в статусе pending`);
        
        for (const pw of pendingWithdrawals) {
          const { data: user } = await supabase
            .from('users')
            .select('ton_balance')
            .eq('id', pw.user_id)
            .single();

          if (user && parseFloat(user.ton_balance) < parseFloat(pw.amount_ton)) {
            report.status = 'WARNING';
            report.details.push(`⚠️ User ${pw.user_id}: недостаточно TON для вывода (баланс: ${user.ton_balance}, заявка: ${pw.amount_ton})`);
          }
        }
      }
    }

  } catch (error) {
    report.status = 'ISSUE';
    report.details.push(`❌ Ошибка проверки: ${error}`);
  }

  reports.push(report);
  report.details.forEach(d => console.log(d));
}

// 3. ДЕПОЗИТЫ
async function checkDepositsSync() {
  console.log('\n💰 3. ПРОВЕРКА ДЕПОЗИТОВ\n');
  const report: SyncReport = {
    module: 'Депозиты',
    status: 'SYNCED',
    details: []
  };

  try {
    // UNI депозиты
    console.log('UNI Депозиты:');
    
    // Проверяем uni_farming_data
    const { data: uniFarmingData, count: uniCount } = await supabase
      .from('uni_farming_data')
      .select('*', { count: 'exact' });

    report.details.push(`✅ Записей в uni_farming_data: ${uniCount || 0}`);

    // Считаем общую сумму депозитов UNI
    let totalUniDeposits = 0;
    uniFarmingData?.forEach(data => {
      totalUniDeposits += parseFloat(data.uni_deposit_amount || 0);
    });

    report.details.push(`✅ Общая сумма UNI депозитов: ${totalUniDeposits.toFixed(2)}`);

    // Проверяем транзакции FARMING_DEPOSIT
    const { data: farmingDepositTx, count: farmingDepositCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('type', 'FARMING_DEPOSIT');

    report.details.push(`✅ Транзакций FARMING_DEPOSIT: ${farmingDepositCount || 0}`);

    // Считаем сумму транзакций депозитов
    let totalTxDeposits = 0;
    farmingDepositTx?.forEach(tx => {
      totalTxDeposits += Math.abs(parseFloat(tx.amount_uni || 0));
    });

    report.details.push(`✅ Сумма транзакций депозитов: ${totalTxDeposits.toFixed(2)}`);

    // Проверяем расхождение
    const depositDiff = Math.abs(totalUniDeposits - totalTxDeposits);
    if (depositDiff > 1) {
      report.status = 'WARNING';
      report.details.push(`⚠️ Расхождение депозитов и транзакций: ${depositDiff.toFixed(2)} UNI`);
      report.details.push(`  Возможно, были прямые SQL обновления или миграция данных`);
    }

    // TON депозиты
    console.log('\nTON Депозиты:');
    
    // Проверяем ton_farming_data
    const { data: tonFarmingData, count: tonCount } = await supabase
      .from('ton_farming_data')
      .select('*', { count: 'exact' });

    report.details.push(`✅ Записей в ton_farming_data: ${tonCount || 0}`);

    // Проверяем boost покупки
    const { data: boostPurchases, count: boostCount } = await supabase
      .from('boost_purchases')
      .select('*', { count: 'exact' });

    report.details.push(`✅ Записей в boost_purchases: ${boostCount || 0}`);

    // Проверяем транзакции BOOST_PURCHASE
    const { data: boostTx, count: boostTxCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('type', 'BOOST_PURCHASE');

    report.details.push(`✅ Транзакций BOOST_PURCHASE: ${boostTxCount || 0}`);

  } catch (error) {
    report.status = 'ISSUE';
    report.details.push(`❌ Ошибка проверки: ${error}`);
  }

  reports.push(report);
  report.details.forEach(d => console.log(d));
}

// 4. БАЛАНСЫ И ТРАНЗАКЦИИ
async function checkBalanceTransactionSync() {
  console.log('\n💳 4. ПРОВЕРКА БАЛАНСОВ И ТРАНЗАКЦИЙ\n');
  const report: SyncReport = {
    module: 'Балансы и транзакции',
    status: 'SYNCED',
    details: []
  };

  try {
    // Получаем топ 10 пользователей по балансам
    const { data: topUsers } = await supabase
      .from('users')
      .select('id, username, uni_balance, ton_balance')
      .order('uni_balance', { ascending: false })
      .limit(10);

    console.log('Топ пользователей по балансу UNI:');
    topUsers?.forEach((user, idx) => {
      console.log(`${idx + 1}. User ${user.id}: ${parseFloat(user.uni_balance).toFixed(2)} UNI, ${parseFloat(user.ton_balance).toFixed(2)} TON`);
    });

    // Для каждого топ пользователя проверяем транзакции
    for (const user of topUsers || []) {
      const { data: userTx } = await supabase
        .from('transactions')
        .select('type, amount_uni, amount_ton, currency')
        .eq('user_id', user.id);

      // Считаем баланс по транзакциям
      let calculatedUni = 0, calculatedTon = 0;
      
      userTx?.forEach(tx => {
        if (tx.currency === 'UNI') {
          calculatedUni += parseFloat(tx.amount_uni || 0);
        } else if (tx.currency === 'TON') {
          calculatedTon += parseFloat(tx.amount_ton || 0);
        }
      });

      const uniDiff = Math.abs(parseFloat(user.uni_balance) - calculatedUni);
      const tonDiff = Math.abs(parseFloat(user.ton_balance) - calculatedTon);

      if (uniDiff > 0.1 || tonDiff > 0.1) {
        report.status = 'WARNING';
        report.details.push(`⚠️ User ${user.id}: расхождение балансов`);
        report.details.push(`  UNI: БД=${user.uni_balance}, Транзакции=${calculatedUni.toFixed(6)}, Разница=${uniDiff.toFixed(6)}`);
        report.details.push(`  TON: БД=${user.ton_balance}, Транзакции=${calculatedTon.toFixed(6)}, Разница=${tonDiff.toFixed(6)}`);
      }
    }

    // Общая статистика транзакций
    const { data: txTypes } = await supabase
      .from('transactions')
      .select('type');

    const typeCounts: Record<string, number> = {};
    txTypes?.forEach(tx => {
      typeCounts[tx.type] = (typeCounts[tx.type] || 0) + 1;
    });

    console.log('\nРаспределение транзакций по типам:');
    Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        report.details.push(`✅ ${type}: ${count} транзакций`);
      });

    // Проверяем последние транзакции
    const { data: recentTx } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('\nПоследние транзакции:');
    recentTx?.forEach(tx => {
      console.log(`- ${tx.created_at}: User ${tx.user_id}, ${tx.type}, ${tx.amount_uni || tx.amount_ton} ${tx.currency}`);
    });

  } catch (error) {
    report.status = 'ISSUE';
    report.details.push(`❌ Ошибка проверки: ${error}`);
  }

  reports.push(report);
  report.details.forEach(d => console.log(d));
}

// ФИНАЛЬНЫЙ ОТЧЕТ
function generateFinalReport() {
  console.log('\n\n=== ФИНАЛЬНЫЙ ОТЧЕТ О СИНХРОНИЗАЦИИ ===\n');
  
  const syncedCount = reports.filter(r => r.status === 'SYNCED').length;
  const warningCount = reports.filter(r => r.status === 'WARNING').length;
  const issueCount = reports.filter(r => r.status === 'ISSUE').length;
  
  console.log(`Проверено модулей: ${reports.length}`);
  console.log(`✅ Синхронизировано: ${syncedCount}`);
  console.log(`⚠️ Предупреждения: ${warningCount}`);
  console.log(`❌ Проблемы: ${issueCount}`);
  
  console.log('\nДетальный статус по модулям:');
  reports.forEach(report => {
    const icon = report.status === 'SYNCED' ? '✅' : report.status === 'WARNING' ? '⚠️' : '❌';
    console.log(`${icon} ${report.module}: ${report.status}`);
  });
  
  // Выводим все проблемы и предупреждения
  const issues = reports.filter(r => r.status !== 'SYNCED');
  if (issues.length > 0) {
    console.log('\n⚠️ ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
    issues.forEach(issue => {
      console.log(`\n${issue.module}:`);
      issue.details
        .filter(d => d.includes('⚠️') || d.includes('❌'))
        .forEach(d => console.log(`  ${d}`));
    });
  } else {
    console.log('\n✅ ВСЕ МОДУЛИ ПОЛНОСТЬЮ СИНХРОНИЗИРОВАНЫ!');
  }
  
  console.log('\n=== ПРОВЕРКА ЗАВЕРШЕНА ===');
}

// Запуск проверки
checkFullDatabaseSync().catch(console.error);