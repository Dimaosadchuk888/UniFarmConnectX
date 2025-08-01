// МОНИТОРИНГ НОВЫХ АККАУНТОВ 304-307: TON BOOST И ДЕПОЗИТЫ
// Проверяем работают ли наши исправления для новых пользователей
// Дата: 01 августа 2025

import { supabase } from './core/supabase';
import { logger } from './core/logger';

interface UserAnalysis {
  userId: number;
  telegramId: number;
  username: string;
  createdAt: string;
  balanceUni: string;
  balanceTon: string;
  tonBoostActive: boolean;
  transactions: any[];
  tonBoostPackages: any[];
  transactionSummary: {
    totalTransactions: number;
    tonDeposits: number;
    tonWithdrawals: number;
    boostPurchases: number;
    farmingRewards: number;
    referralRewards: number;
  };
}

async function analyzeUser(userId: number): Promise<UserAnalysis | null> {
  try {
    // 1. Основные данные пользователя
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.log(`❌ Пользователь ${userId} не найден:`, userError?.message);
      return null;
    }

    // 2. Все транзакции пользователя
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (txError) {
      console.warn(`Ошибка получения транзакций для ${userId}:`, txError.message);
    }

    // 3. TON Boost пакеты
    const { data: tonBoostPackages, error: boostError } = await supabase
      .from('ton_boost_purchases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (boostError) {
      console.warn(`Ошибка получения TON Boost для ${userId}:`, boostError.message);
    }

    // 4. Анализ транзакций
    const txList = transactions || [];
    const transactionSummary = {
      totalTransactions: txList.length,
      tonDeposits: txList.filter(tx => tx.type === 'TON_DEPOSIT').length,
      tonWithdrawals: txList.filter(tx => tx.type === 'TON_WITHDRAWAL').length,
      boostPurchases: txList.filter(tx => tx.type === 'TON_BOOST_PURCHASE').length,
      farmingRewards: txList.filter(tx => tx.type === 'FARMING_REWARD').length,
      referralRewards: txList.filter(tx => tx.type === 'REFERRAL_REWARD').length,
    };

    return {
      userId: user.id,
      telegramId: user.telegram_id,
      username: user.username || 'N/A',
      createdAt: user.created_at,
      balanceUni: user.balance_uni,
      balanceTon: user.balance_ton,
      tonBoostActive: user.ton_boost_active || false,
      transactions: txList,
      tonBoostPackages: tonBoostPackages || [],
      transactionSummary
    };

  } catch (error) {
    console.error(`❌ Ошибка анализа пользователя ${userId}:`, error);
    return null;
  }
}

async function checkTonBoostIntegrity(analysis: UserAnalysis): Promise<void> {
  console.log(`\n🔍 АНАЛИЗ TON BOOST для пользователя ${analysis.userId}:`);

  if (analysis.tonBoostPackages.length === 0) {
    console.log('   📦 TON Boost пакеты: Нет покупок');
    return;
  }

  console.log(`   📦 TON Boost пакеты: ${analysis.tonBoostPackages.length} покупок`);
  
  for (const boost of analysis.tonBoostPackages) {
    console.log(`      Пакет ${boost.package_type}: ${boost.amount_ton} TON, статус: ${boost.status}`);
    console.log(`      Дата покупки: ${boost.created_at}`);
    
    // Проверяем есть ли соответствующая транзакция TON_BOOST_PURCHASE
    const correspondingTx = analysis.transactions.find(tx => 
      tx.type === 'TON_BOOST_PURCHASE' && 
      Math.abs(new Date(tx.created_at).getTime() - new Date(boost.created_at).getTime()) < 60000 // в пределах минуты
    );

    if (correspondingTx) {
      console.log(`      ✅ Найдена соответствующая транзакция: ID ${correspondingTx.id}`);
    } else {
      console.log(`      ❌ НЕ НАЙДЕНА соответствующая транзакция TON_BOOST_PURCHASE!`);
    }
  }
}

async function checkDepositIntegrity(analysis: UserAnalysis): Promise<void> {
  console.log(`\n💰 АНАЛИЗ ДЕПОЗИТОВ для пользователя ${analysis.userId}:`);

  const currentTonBalance = parseFloat(analysis.balanceTon);
  const tonDeposits = analysis.transactions.filter(tx => tx.type === 'TON_DEPOSIT');
  const tonWithdrawals = analysis.transactions.filter(tx => tx.type === 'TON_WITHDRAWAL');
  const tonBoostPurchases = analysis.transactions.filter(tx => tx.type === 'TON_BOOST_PURCHASE');

  console.log(`   Текущий TON баланс: ${currentTonBalance} TON`);
  console.log(`   TON депозиты: ${tonDeposits.length}`);
  console.log(`   TON выводы: ${tonWithdrawals.length}`);
  console.log(`   TON Boost покупки: ${tonBoostPurchases.length}`);

  if (tonDeposits.length > 0) {
    console.log(`   📥 ДЕПОЗИТЫ:`);
    tonDeposits.forEach(tx => {
      console.log(`      ${tx.amount_ton} TON - ${tx.created_at} - ${tx.description || 'N/A'}`);
    });
  }

  if (tonBoostPurchases.length > 0) {
    console.log(`   🚀 TON BOOST ПОКУПКИ:`);
    tonBoostPurchases.forEach(tx => {
      console.log(`      ${tx.amount_ton} TON - ${tx.created_at} - ${tx.description || 'N/A'}`);
    });
  }

  // Простая проверка баланса
  const totalDeposits = tonDeposits.reduce((sum, tx) => sum + parseFloat(tx.amount_ton || '0'), 0);
  const totalWithdrawals = tonWithdrawals.reduce((sum, tx) => sum + parseFloat(tx.amount_ton || '0'), 0);
  const totalBoostSpent = tonBoostPurchases.reduce((sum, tx) => sum + parseFloat(tx.amount_ton || '0'), 0);
  
  const expectedBalance = totalDeposits - totalWithdrawals - totalBoostSpent;
  const balanceDifference = Math.abs(currentTonBalance - expectedBalance);

  console.log(`   📊 ПРОВЕРКА БАЛАНСА:`);
  console.log(`      Депозиты: +${totalDeposits} TON`);
  console.log(`      Выводы: -${totalWithdrawals} TON`);
  console.log(`      Boost покупки: -${totalBoostSpent} TON`);
  console.log(`      Ожидаемый баланс: ${expectedBalance} TON`);
  console.log(`      Фактический баланс: ${currentTonBalance} TON`);
  console.log(`      Разница: ${balanceDifference} TON`);

  if (balanceDifference > 0.001) {
    console.log(`      ⚠️ РАСХОЖДЕНИЕ БАЛАНСА! Разница больше 0.001 TON`);
  } else {
    console.log(`      ✅ Баланс соответствует транзакциям`);
  }
}

async function checkTransactionHistory(analysis: UserAnalysis): Promise<void> {
  console.log(`\n📜 АНАЛИЗ ИСТОРИИ ТРАНЗАКЦИЙ для пользователя ${analysis.userId}:`);
  
  if (analysis.transactions.length === 0) {
    console.log('   📝 Транзакций нет');
    return;
  }

  console.log(`   📝 Всего транзакций: ${analysis.transactions.length}`);
  
  // Группируем по типам
  const typeGroups = analysis.transactions.reduce((groups, tx) => {
    const type = tx.type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(tx);
    return groups;
  }, {});

  for (const [type, txs] of Object.entries(typeGroups)) {
    console.log(`      ${type}: ${(txs as any[]).length} транзакций`);
  }

  // Проверяем хронологию
  console.log(`   ⏰ ХРОНОЛОГИЯ (первые 5 транзакций):`);
  analysis.transactions.slice(0, 5).forEach(tx => {
    console.log(`      ${tx.created_at} - ${tx.type} - ${tx.amount_ton || tx.amount_uni || '0'} ${tx.amount_ton ? 'TON' : 'UNI'}`);
  });
}

async function main(): Promise<void> {
  console.log('🔍 МОНИТОРИНГ НОВЫХ АККАУНТОВ: TON BOOST И ДЕПОЗИТЫ');
  console.log('='.repeat(80));
  console.log('Анализируем аккаунты 304-307 после наших исправлений');
  console.log('Дата анализа:', new Date().toISOString());
  console.log('');

  const newUserIds = [304, 305, 306, 307];
  
  for (const userId of newUserIds) {
    console.log('═'.repeat(60));
    console.log(`👤 ПОЛЬЗОВАТЕЛЬ ${userId}`);
    console.log('═'.repeat(60));

    const analysis = await analyzeUser(userId);
    
    if (!analysis) {
      console.log(`❌ Не удалось проанализировать пользователя ${userId}`);
      continue;
    }

    console.log(`📊 ОСНОВНАЯ ИНФОРМАЦИЯ:`);
    console.log(`   Telegram ID: ${analysis.telegramId}`);
    console.log(`   Username: ${analysis.username}`);
    console.log(`   Дата создания: ${analysis.createdAt}`);
    console.log(`   UNI баланс: ${analysis.balanceUni}`);
    console.log(`   TON баланс: ${analysis.balanceTon}`);
    console.log(`   TON Boost активен: ${analysis.tonBoostActive ? 'ДА' : 'НЕТ'}`);

    await checkTransactionHistory(analysis);
    await checkDepositIntegrity(analysis);
    await checkTonBoostIntegrity(analysis);

    console.log('\n');
  }

  console.log('═'.repeat(60));
  console.log('🎯 ОБЩИЕ ВЫВОДЫ');
  console.log('═'.repeat(60));
  console.log('Мониторинг завершен. Проверьте результаты выше.');
}

// Запуск мониторинга
main().catch(console.error);