#!/usr/bin/env tsx
/**
 * 🔍 СИСТЕМНЫЙ АНАЛИЗ ПРОБЛЕМЫ ДЕПОЗИТОВ
 * Поиск паттернов проблемных аккаунтов и выявление корня проблемы
 */

import { supabase } from './core/supabase';

async function analyzeSystemDepositProblem() {
  console.log('🔍 СИСТЕМНЫЙ АНАЛИЗ ПРОБЛЕМЫ ДЕПОЗИТОВ');
  console.log('='.repeat(80));

  try {
    // 1. Найти все аккаунты с активным TON Boost но без TON_DEPOSIT
    console.log('\n1️⃣ ПОИСК ПРОБЛЕМНЫХ АККАУНТОВ:');
    console.log('Ищем пользователей с активным TON Boost, но без депозитов...');
    
    const { data: problematicUsers, error: problematicError } = await supabase
      .from('users')
      .select('id, telegram_id, username, first_name, ton_boost_active, ton_boost_package, balance_ton, created_at')
      .eq('ton_boost_active', true)
      .gt('ton_boost_package', 0);

    if (problematicError) {
      console.log('❌ Ошибка получения пользователей:', problematicError.message);
      return;
    }

    console.log(`✅ Найдено пользователей с активным TON Boost: ${problematicUsers?.length || 0}`);

    const problemUsers = [];
    
    if (problematicUsers) {
      for (const user of problematicUsers) {
        // Проверяем есть ли у пользователя TON_DEPOSIT транзакции
        const { data: deposits, error: depositError } = await supabase
          .from('transactions')
          .select('id, amount, created_at')
          .eq('user_id', user.id)
          .eq('type', 'TON_DEPOSIT');

        if (!depositError) {
          const depositCount = deposits?.length || 0;
          const totalDeposited = deposits?.reduce((sum, dep) => sum + parseFloat(dep.amount || '0'), 0) || 0;

          if (depositCount === 0) {
            problemUsers.push({
              ...user,
              depositCount: 0,
              totalDeposited: 0,
              issue: 'NO_DEPOSITS'
            });
          } else if (totalDeposited < 0.5) {
            problemUsers.push({
              ...user,
              depositCount,
              totalDeposited,
              issue: 'INSUFFICIENT_DEPOSITS'
            });
          }
        }
      }
    }

    console.log(`\n🚨 НАЙДЕНО ПРОБЛЕМНЫХ АККАУНТОВ: ${problemUsers.length}`);
    
    problemUsers.forEach((user, i) => {
      console.log(`\n❌ Проблемный аккаунт ${i + 1}:`);
      console.log(`   ID: ${user.id}, telegram_id: ${user.telegram_id}`);
      console.log(`   username: ${user.username || 'НЕ УКАЗАН'}`);
      console.log(`   first_name: ${user.first_name || 'НЕ УКАЗАН'}`);
      console.log(`   ton_boost_package: ${user.ton_boost_package}`);
      console.log(`   balance_ton: ${user.balance_ton}`);
      console.log(`   depositCount: ${user.depositCount}`);
      console.log(`   totalDeposited: ${user.totalDeposited}`);
      console.log(`   created_at: ${user.created_at}`);
      console.log(`   issue: ${user.issue}`);
    });

    // 2. Анализ временных паттернов
    console.log('\n2️⃣ АНАЛИЗ ВРЕМЕННЫХ ПАТТЕРНОВ:');
    
    const timeGroups = {
      july: problemUsers.filter(u => u.created_at.startsWith('2025-07')),
      august: problemUsers.filter(u => u.created_at.startsWith('2025-08'))
    };

    console.log(`📅 Проблемные аккаунты по времени создания:`);
    console.log(`   Июль 2025: ${timeGroups.july.length}`);
    console.log(`   Август 2025: ${timeGroups.august.length}`);

    // 3. Анализ успешных аккаунтов для сравнения
    console.log('\n3️⃣ АНАЛИЗ УСПЕШНЫХ АККАУНТОВ:');
    
    const { data: successfulUsers, error: successError } = await supabase
      .from('users')
      .select('id, telegram_id, username, ton_boost_active, ton_boost_package, balance_ton, created_at')
      .eq('ton_boost_active', true)
      .gt('ton_boost_package', 0)
      .limit(10);

    if (!successError && successfulUsers) {
      let successfulCount = 0;
      
      for (const user of successfulUsers) {
        const { data: deposits } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('type', 'TON_DEPOSIT');

        const totalDeposited = deposits?.reduce((sum, dep) => sum + parseFloat(dep.amount || '0'), 0) || 0;
        
        if (totalDeposited >= 0.5) {
          successfulCount++;
          if (successfulCount <= 3) {
            console.log(`\n✅ Успешный аккаунт ${successfulCount}:`);
            console.log(`   ID: ${user.id}, telegram_id: ${user.telegram_id}`);
            console.log(`   username: ${user.username || 'НЕ УКАЗАН'}`);
            console.log(`   ton_boost_package: ${user.ton_boost_package}`);
            console.log(`   totalDeposited: ${totalDeposited} TON`);
            console.log(`   created_at: ${user.created_at}`);
          }
        }
      }
      
      console.log(`\n📊 Успешных аккаунтов найдено: ${successfulCount}`);
    }

    // 4. Анализ дубликатов пользователей
    console.log('\n4️⃣ АНАЛИЗ ДУБЛИКАЦИИ ПОЛЬЗОВАТЕЛЕЙ:');
    
    const { data: duplicateUsers, error: dupError } = await supabase
      .from('users')
      .select('username, COUNT(*) as count')
      .not('username', 'is', null)
      .group('username')
      .having('COUNT(*)', 'gt', 1);

    if (!dupError && duplicateUsers) {
      console.log(`🔍 Найдено дублированных имен пользователей: ${duplicateUsers.length}`);
      
      for (const dup of duplicateUsers.slice(0, 5)) {
        console.log(`\n👥 Дубликат: ${dup.username} (${dup.count} аккаунтов)`);
        
        const { data: userInstances } = await supabase
          .from('users')
          .select('id, telegram_id, ton_wallet_address, ton_wallet_verified, ton_boost_active, created_at')
          .eq('username', dup.username)
          .order('created_at', { ascending: true });

        userInstances?.forEach((instance, i) => {
          console.log(`   ${i + 1}. ID: ${instance.id}, telegram_id: ${instance.telegram_id}`);
          console.log(`      wallet: ${instance.ton_wallet_address ? 'ЕСТЬ' : 'НЕТ'}`);
          console.log(`      boost: ${instance.ton_boost_active ? 'АКТИВЕН' : 'НЕТ'}`);
          console.log(`      created: ${instance.created_at}`);
        });
      }
    }

    // 5. Анализ транзакций с BOC данными
    console.log('\n5️⃣ АНАЛИЗ ТРАНЗАКЦИЙ С BOC ДАННЫМИ:');
    
    const { data: bocTransactions, error: bocError } = await supabase
      .from('transactions')
      .select('user_id, amount, created_at, description')
      .eq('type', 'TON_DEPOSIT')
      .ilike('description', '%te6cck%')
      .gte('created_at', '2025-07-01T00:00:00.000Z')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!bocError && bocTransactions) {
      console.log(`🔗 Найдено TON депозитов с BOC данными: ${bocTransactions.length}`);
      
      bocTransactions.forEach((tx, i) => {
        console.log(`\n🔑 BOC транзакция ${i + 1}:`);
        console.log(`   user_id: ${tx.user_id}, amount: ${tx.amount} TON`);
        console.log(`   created_at: ${tx.created_at}`);
      });

      // Проверим какие из этих пользователей имеют проблемы
      const bocUserIds = [...new Set(bocTransactions.map(tx => tx.user_id))];
      const problematicBocUsers = problemUsers.filter(u => bocUserIds.includes(u.id));
      
      console.log(`\n🚨 Из пользователей с BOC транзакциями проблемных: ${problematicBocUsers.length}`);
    }

    // 6. Финальная статистика
    console.log('\n6️⃣ ФИНАЛЬНАЯ СТАТИСТИКА:');
    
    const totalBoostUsers = problematicUsers?.length || 0;
    const problemPercentage = totalBoostUsers > 0 ? (problemUsers.length / totalBoostUsers * 100).toFixed(1) : 0;
    
    console.log(`📊 Общая статистика:`);
    console.log(`   Всего пользователей с TON Boost: ${totalBoostUsers}`);
    console.log(`   Проблемных аккаунтов: ${problemUsers.length}`);
    console.log(`   Процент проблемных: ${problemPercentage}%`);
    console.log(`   Дублированных имен: ${duplicateUsers?.length || 0}`);

    console.log('\n' + '='.repeat(80));
    console.log('🎯 ВЕРОЯТНЫЕ ПРИЧИНЫ СИСТЕМНОЙ ПРОБЛЕМЫ:');
    console.log('');
    console.log('1. 🔄 ПРОБЛЕМА ДЕДУПЛИКАЦИИ ПОЛЬЗОВАТЕЛЕЙ:');
    console.log('   - Создаются дублированные аккаунты для одного пользователя');
    console.log('   - Депозит привязывается к одному ID, а boost к другому');
    console.log('');
    console.log('2. ⏰ ПРОБЛЕМА TIMING В WEBHOOK ОБРАБОТЧИКЕ:');
    console.log('   - Webhook получает данные, но обработка прерывается');
    console.log('   - Boost активируется, но TON_DEPOSIT не создается');
    console.log('');
    console.log('3. 🔗 ПРОБЛЕМА С BOC ОБРАБОТКОЙ:');
    console.log('   - Некоторые транзакции содержат BOC данные');
    console.log('   - Возможно разная обработка разных типов tx_hash');
    console.log('');
    console.log('4. 🔑 ПРОБЛЕМА ПРИВЯЗКИ КОШЕЛЬКОВ:');
    console.log('   - У некоторых пользователей нет привязанного кошелька');
    console.log('   - Система не может корректно идентифицировать получателя');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА СИСТЕМНОГО АНАЛИЗА:', error);
  }
}

analyzeSystemDepositProblem().catch(console.error);