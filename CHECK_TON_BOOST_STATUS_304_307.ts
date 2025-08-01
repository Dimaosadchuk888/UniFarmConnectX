// ПРОВЕРКА СТАТУСА TON BOOST ПАКЕТОВ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ 304-307
// Проверяем активированы ли их пакеты и начали ли они работать
// Дата: 01 августа 2025

import { supabase } from './core/supabase';
import { logger } from './core/logger';

interface TonBoostStatus {
  userId: number;
  username: string;
  tonBoostActive: boolean;
  tonBalance: string;
  uniBalance: string;
  totalTonDeposits: number;
  totalTonSpent: number;
  expectedTonBalance: number;
  actualTonBalance: number;
  balanceDiscrepancy: number;
  boostPackages: any[];
  recentTransactions: any[];
  farmingStatus: {
    isActive: boolean;
    depositAmount: string;
    boostMultiplier: number;
  };
}

async function checkUserTonBoostStatus(userId: number): Promise<TonBoostStatus | null> {
  try {
    // 1. Основная информация о пользователе
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.log(`❌ Пользователь ${userId} не найден`);
      return null;
    }

    // 2. Получаем все транзакции пользователя
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (txError) {
      console.warn(`Ошибка получения транзакций для ${userId}:`, txError.message);
    }

    // 3. Попытка получить TON Boost пакеты (таблица может не существовать)
    let boostPackages = [];
    try {
      const { data: packages, error: boostError } = await supabase
        .from('ton_boost_purchases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!boostError && packages) {
        boostPackages = packages;
      }
    } catch (error) {
      console.log(`Таблица ton_boost_purchases не существует или недоступна`);
    }

    // 4. Анализ TON транзакций
    const allTransactions = transactions || [];
    const tonDeposits = allTransactions.filter(tx => 
      tx.type === 'TON_DEPOSIT' || (tx.type === 'DEPOSIT' && tx.amount_ton > 0)
    );
    const tonWithdrawals = allTransactions.filter(tx => tx.type === 'TON_WITHDRAWAL');
    const tonBoostPurchases = allTransactions.filter(tx => 
      tx.type === 'TON_BOOST_PURCHASE' || tx.type === 'BOOST_PAYMENT'
    );

    const totalTonDeposits = tonDeposits.reduce((sum, tx) => sum + parseFloat(tx.amount_ton || '0'), 0);
    const totalTonWithdrawals = tonWithdrawals.reduce((sum, tx) => sum + parseFloat(tx.amount_ton || '0'), 0);
    const totalTonSpent = tonBoostPurchases.reduce((sum, tx) => sum + parseFloat(tx.amount_ton || '0'), 0);

    const expectedTonBalance = totalTonDeposits - totalTonWithdrawals - totalTonSpent;
    const actualTonBalance = parseFloat(user.balance_ton || '0');
    const balanceDiscrepancy = Math.abs(actualTonBalance - expectedTonBalance);

    // 5. Проверка статуса фарминга (UNI фарминг)
    const farmingDeposits = allTransactions.filter(tx => tx.type === 'FARMING_DEPOSIT');
    const totalFarmingDeposit = farmingDeposits.reduce((sum, tx) => sum + parseFloat(tx.amount_uni || '0'), 0);
    const boostMultiplier = user.ton_boost_active ? (user.ton_boost_multiplier || 2) : 1;

    return {
      userId: user.id,
      username: user.username || 'N/A',
      tonBoostActive: user.ton_boost_active || false,
      tonBalance: user.balance_ton || '0',
      uniBalance: user.balance_uni || '0',
      totalTonDeposits,
      totalTonSpent,
      expectedTonBalance,
      actualTonBalance,
      balanceDiscrepancy,
      boostPackages,
      recentTransactions: allTransactions.slice(0, 10),
      farmingStatus: {
        isActive: user.uni_farming_active || false,
        depositAmount: totalFarmingDeposit.toString(),
        boostMultiplier
      }
    };

  } catch (error) {
    console.error(`❌ Ошибка анализа пользователя ${userId}:`, error);
    return null;
  }
}

async function displayTonBoostAnalysis(status: TonBoostStatus): Promise<void> {
  console.log(`\n🚀 TON BOOST АНАЛИЗ - Пользователь ${status.userId} (@${status.username})`);
  console.log('═'.repeat(70));

  // Основная информация
  console.log(`📊 ОБЩАЯ ИНФОРМАЦИЯ:`);
  console.log(`   TON Boost активен: ${status.tonBoostActive ? '✅ ДА' : '❌ НЕТ'}`);
  console.log(`   UNI фарминг активен: ${status.farmingStatus.isActive ? '✅ ДА' : '❌ НЕТ'}`);
  console.log(`   Boost множитель: ${status.farmingStatus.boostMultiplier}x`);

  // Балансы
  console.log(`\n💰 БАЛАНСЫ:`);
  console.log(`   TON баланс: ${status.tonBalance} TON`);
  console.log(`   UNI баланс: ${status.uniBalance} UNI`);
  console.log(`   UNI в фарминге: ${status.farmingStatus.depositAmount} UNI`);

  // TON транзакции анализ
  console.log(`\n💎 TON ТРАНЗАКЦИИ:`);
  console.log(`   Всего депозитов: ${status.totalTonDeposits} TON`);
  console.log(`   Потрачено на Boost: ${status.totalTonSpent} TON`);
  console.log(`   Ожидаемый баланс: ${status.expectedTonBalance} TON`);
  console.log(`   Фактический баланс: ${status.actualTonBalance} TON`);
  console.log(`   Расхождение: ${status.balanceDiscrepancy} TON ${status.balanceDiscrepancy > 0.001 ? '⚠️' : '✅'}`);

  // TON Boost пакеты
  console.log(`\n📦 TON BOOST ПАКЕТЫ:`);
  if (status.boostPackages.length === 0) {
    console.log(`   Нет TON Boost пакетов в базе данных`);
  } else {
    status.boostPackages.forEach((pkg, index) => {
      console.log(`   Пакет ${index + 1}: ${pkg.package_type} - ${pkg.amount_ton} TON (${pkg.status})`);
      console.log(`      Дата покупки: ${pkg.created_at}`);
    });
  }

  // Недавние транзакции
  console.log(`\n📜 НЕДАВНИЕ ТРАНЗАКЦИИ (последние 5):`);
  status.recentTransactions.slice(0, 5).forEach(tx => {
    const amount = tx.amount_ton || tx.amount_uni || '0';
    const currency = tx.amount_ton ? 'TON' : 'UNI';
    console.log(`   ${tx.type}: ${amount} ${currency} - ${tx.created_at.substring(0, 19)}`);
  });

  // Выводы о работоспособности TON Boost
  console.log(`\n🎯 АНАЛИЗ TON BOOST:`);
  if (status.tonBoostActive && status.farmingStatus.isActive) {
    console.log(`   ✅ TON Boost активен и UNI фарминг работает`);
    console.log(`   ✅ Доходность увеличена в ${status.farmingStatus.boostMultiplier}x раз`);
    console.log(`   📈 Система работает корректно`);
  } else if (status.tonBoostActive && !status.farmingStatus.isActive) {
    console.log(`   ⚠️ TON Boost активен, но UNI фарминг НЕ запущен`);
    console.log(`   💡 Пользователю нужно запустить UNI фарминг для получения boost`);
  } else if (!status.tonBoostActive && status.totalTonSpent > 0) {
    console.log(`   ❌ TON потрачен на Boost, но система НЕ активна`);
    console.log(`   🔧 Требуется активация TON Boost пакетов`);
  } else {
    console.log(`   📝 TON Boost не активирован (пользователь не покупал пакеты)`);
  }
}

async function main(): Promise<void> {
  console.log('🔍 ПРОВЕРКА СТАТУСА TON BOOST ПАКЕТОВ');
  console.log('='.repeat(80));
  console.log('Анализируем пользователей 304-307 после исправлений системы');
  console.log('Дата:', new Date().toISOString());
  console.log('');

  const userIds = [304, 305, 306, 307];
  const results: TonBoostStatus[] = [];

  for (const userId of userIds) {
    const status = await checkUserTonBoostStatus(userId);
    if (status) {
      results.push(status);
      await displayTonBoostAnalysis(status);
    } else {
      console.log(`❌ Не удалось проанализировать пользователя ${userId}`);
    }
  }

  // Общий вывод
  console.log('\n' + '═'.repeat(80));
  console.log('🎯 ОБЩИЕ ВЫВОДЫ ПО TON BOOST СИСТЕМЕ');
  console.log('═'.repeat(80));

  const activeBoostUsers = results.filter(r => r.tonBoostActive);
  const farmingUsers = results.filter(r => r.farmingStatus.isActive);
  const usersWithTonSpent = results.filter(r => r.totalTonSpent > 0);

  console.log(`📊 СТАТИСТИКА:`);
  console.log(`   Всего пользователей: ${results.length}`);
  console.log(`   TON Boost активен: ${activeBoostUsers.length} пользователей`);
  console.log(`   UNI фарминг активен: ${farmingUsers.length} пользователей`);
  console.log(`   Потратили TON: ${usersWithTonSpent.length} пользователей`);

  if (activeBoostUsers.length > 0) {
    console.log(`\n✅ TON BOOST РАБОТАЕТ у пользователей: ${activeBoostUsers.map(u => u.userId).join(', ')}`);
  }

  if (usersWithTonSpent.length > activeBoostUsers.length) {
    const problematicUsers = usersWithTonSpent.filter(u => !u.tonBoostActive);
    console.log(`\n⚠️ ТРЕБУЮТ ВНИМАНИЯ (потратили TON, но Boost неактивен): ${problematicUsers.map(u => u.userId).join(', ')}`);
  }

  console.log(`\n🔧 РЕКОМЕНДАЦИИ:`);
  if (activeBoostUsers.length === 0 && usersWithTonSpent.length > 0) {
    console.log(`   - Проверить активацию TON Boost пакетов вручную`);
    console.log(`   - Убедиться что таблица ton_boost_purchases создана`);
  }
  if (farmingUsers.length < activeBoostUsers.length) {
    console.log(`   - Напомнить пользователям запустить UNI фарминг для получения boost`);
  }
  console.log(`   - Мониторить новых пользователей на предмет корректной работы TON Boost`);
}

// Запуск анализа
main().catch(console.error);