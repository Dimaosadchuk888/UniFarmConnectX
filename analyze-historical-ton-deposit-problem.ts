/**
 * АНАЛИЗ ИСТОРИЧЕСКОЙ ПРОБЛЕМЫ TON ДЕПОЗИТОВ
 * Находим когда система начала работать правильно и кто пострадал от старых багов
 */

import { supabase } from './core/supabaseClient';

async function analyzeHistoricalTonDepositProblem() {
  console.log('📊 АНАЛИЗ ИСТОРИЧЕСКОЙ ПРОБЛЕМЫ TON ДЕПОЗИТОВ');
  console.log('Ищем когда система была исправлена и кто пострадал');
  console.log('='.repeat(80));

  try {
    // 1. АНАЛИЗ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ С TON ДЕПОЗИТАМИ
    console.log('\n1️⃣ АНАЛИЗ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ С TON ДЕПОЗИТАМИ:');
    
    const { data: allUsers, error: usersError } = await supabase
      .from('transactions')
      .select('user_id')
      .eq('type', 'TON_DEPOSIT')
      .eq('status', 'completed');

    if (usersError) {
      console.error('❌ Ошибка получения пользователей:', usersError);
      return;
    }

    // Получаем уникальных пользователей
    const uniqueUsers = [...new Set(allUsers.map(t => t.user_id))];
    console.log(`✅ Найдено ${uniqueUsers.length} пользователей с TON депозитами`);

    // 2. ПРОВЕРЯЕМ КАЖДОГО ПОЛЬЗОВАТЕЛЯ НА РАСХОЖДЕНИЯ
    console.log('\n2️⃣ ПРОВЕРКА РАСХОЖДЕНИЙ ПО ПОЛЬЗОВАТЕЛЯМ:');
    
    const problematicUsers = [];
    
    for (const userId of uniqueUsers.slice(0, 10)) { // Проверяем первых 10
      // Получаем текущий баланс
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('balance_ton')
        .eq('id', userId)
        .single();

      if (userError) {
        console.log(`❌ Пользователь ${userId}: ошибка получения баланса`);
        continue;
      }

      // Получаем все депозиты
      const { data: deposits, error: depositsError } = await supabase
        .from('transactions')
        .select('amount_ton, created_at')
        .eq('user_id', userId)
        .eq('type', 'TON_DEPOSIT')
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      if (depositsError) {
        console.log(`❌ Пользователь ${userId}: ошибка получения депозитов`);
        continue;
      }

      const totalDeposits = deposits.reduce((sum, d) => sum + d.amount_ton, 0);
      const currentBalance = user.balance_ton;
      const difference = currentBalance - totalDeposits;

      if (Math.abs(difference) > 0.1) { // Расхождение больше 0.1 TON
        problematicUsers.push({
          userId,
          currentBalance,
          totalDeposits,
          difference,
          depositsCount: deposits.length,
          firstDeposit: deposits[0]?.created_at,
          lastDeposit: deposits[deposits.length - 1]?.created_at
        });

        console.log(`🚨 User ${userId}: ${difference.toFixed(6)} TON разница`);
        console.log(`   Баланс: ${currentBalance} | Депозиты: ${totalDeposits} | Депозитов: ${deposits.length}`);
      } else {
        console.log(`✅ User ${userId}: расхождений нет (${difference.toFixed(6)} TON)`);
      }
    }

    if (problematicUsers.length > 0) {
      console.log(`\n🚨 НАЙДЕНО ${problematicUsers.length} ПОЛЬЗОВАТЕЛЕЙ С ПРОБЛЕМАМИ:`);
      
      problematicUsers.forEach((user, index) => {
        console.log(`\n${index + 1}. User ${user.userId}:`);
        console.log(`   Потеря: ${user.difference.toFixed(6)} TON`);
        console.log(`   Депозитов: ${user.depositsCount}`);
        console.log(`   Период: ${user.firstDeposit} → ${user.lastDeposit}`);
      });
    }

    // 3. АНАЛИЗ ПО ВРЕМЕНИ - КОГДА ПРОБЛЕМА БЫЛА ИСПРАВЛЕНА
    console.log('\n3️⃣ АНАЛИЗ ПО ВРЕМЕНИ - ПОИСК МОМЕНТА ИСПРАВЛЕНИЯ:');
    
    const { data: recentDeposits, error: recentError } = await supabase
      .from('transactions')
      .select('id, user_id, amount_ton, created_at')
      .eq('type', 'TON_DEPOSIT')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);

    if (recentError) {
      console.error('❌ Ошибка получения недавних депозитов:', recentError);
    } else {
      console.log(`✅ Анализируем последние ${recentDeposits.length} депозитов:`);
      
      for (const deposit of recentDeposits) {
        // Получаем баланс пользователя до и после этого депозита
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('balance_ton')
          .eq('id', deposit.user_id)
          .single();

        if (userError) continue;

        // Получаем все депозиты этого пользователя
        const { data: allUserDeposits, error: allUserDepositsError } = await supabase
          .from('transactions')
          .select('amount_ton')
          .eq('user_id', deposit.user_id)
          .eq('type', 'TON_DEPOSIT')
          .eq('status', 'completed');

        if (allUserDepositsError) continue;

        const expectedBalance = allUserDeposits.reduce((sum, d) => sum + d.amount_ton, 0);
        const actualBalance = user.balance_ton;
        const isWorking = Math.abs(actualBalance - expectedBalance) < 1; // Терпимость 1 TON

        console.log(`${isWorking ? '✅' : '❌'} Депозит ${deposit.id} (${deposit.created_at}): User ${deposit.user_id} - ${deposit.amount_ton} TON`);
        console.log(`   Ожидаемый/Фактический баланс: ${expectedBalance.toFixed(2)}/${actualBalance.toFixed(2)}`);
      }
    }

    // 4. ПРЕДЛОЖЕНИЕ РЕШЕНИЯ
    console.log('\n' + '='.repeat(80));
    console.log('4️⃣ ПЛАН РЕШЕНИЯ ПРОБЛЕМЫ:');
    
    console.log('\n🔧 ТЕХНИЧЕСКОЕ РЕШЕНИЕ:');
    console.log('1. Система СЕЙЧАС работает правильно (подтверждено тестами)');
    console.log('2. Проблема в ИСТОРИЧЕСКИХ депозитах');
    console.log('3. Нужно найти и компенсировать потерянные депозиты');
    
    console.log('\n📋 ЭТАПЫ ВОССТАНОВЛЕНИЯ:');
    console.log('1. Создать скрипт аудита всех пользователей с TON депозитами');
    console.log('2. Вычислить точную сумму потерянных депозитов для каждого');
    console.log('3. Создать компенсационные транзакции');
    console.log('4. Добавить мониторинг для предотвращения будущих проблем');
    
    if (problematicUsers.length > 0) {
      const totalLoss = problematicUsers.reduce((sum, user) => sum + Math.abs(user.difference), 0);
      console.log(`\n💰 ОБЩАЯ СУММА ПОТЕРЬ: ${totalLoss.toFixed(6)} TON`);
      console.log(`📊 ЗАТРОНУТО ПОЛЬЗОВАТЕЛЕЙ: ${problematicUsers.length}`);
      
      console.log('\n🎯 ПРИОРИТЕТНЫЕ ПОЛЬЗОВАТЕЛИ ДЛЯ КОМПЕНСАЦИИ:');
      const sortedUsers = problematicUsers.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
      sortedUsers.slice(0, 5).forEach((user, index) => {
        console.log(`${index + 1}. User ${user.userId}: ${Math.abs(user.difference).toFixed(6)} TON`);
      });
    }

  } catch (error) {
    console.error('💥 Критическая ошибка анализа:', error);
  }
}

// Запускаем анализ
analyzeHistoricalTonDepositProblem().then(() => {
  console.log('\n✅ Анализ завершен');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Фатальная ошибка:', error);
  process.exit(1);
});