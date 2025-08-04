#!/usr/bin/env tsx
/**
 * 🕵️ РАССЛЕДОВАНИЕ: Потерянные 1.65 TON пользователя ID 255
 */

import { supabase } from './core/supabase';

async function investigateUser255() {
  console.log('🕵️ РАССЛЕДОВАНИЕ: Потерянные 1.65 TON пользователя ID 255');
  console.log('='.repeat(70));

  try {
    // 1. Сначала посмотрим структуру таблицы users
    console.log('\n1️⃣ СТРУКТУРА ТАБЛИЦЫ USERS:');
    const { data: sampleUsers, error: sampleError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.log('❌ Ошибка доступа к таблице users:', sampleError.message);
      return;
    }

    console.log('✅ Пример структуры пользователя:', sampleUsers?.[0] ? Object.keys(sampleUsers[0]) : 'нет данных');

    // 2. Ищем пользователя ID 255 по правильному полю
    console.log('\n2️⃣ ПОИСК ПОЛЬЗОВАТЕЛЯ ID 255:');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 255)  // Используем 'id' вместо 'user_id'
      .single();

    if (userError) {
      console.log('❌ Пользователь ID 255 НЕ НАЙДЕН:', userError.message);
      
      // Проверим диапазон ID пользователей
      const { data: userRange, error: rangeError } = await supabase
        .from('users')
        .select('user_id')
        .order('user_id', { ascending: false })
        .limit(10);
      
      if (!rangeError && userRange) {
        console.log('\n📊 Последние 10 пользователей:');
        userRange.forEach(u => console.log(`   - ID: ${u.user_id}`));
      }
      
      return;
    }

    console.log('✅ Пользователь найден:', {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      balance_ton: user.balance_ton,
      balance_uni: user.balance_uni,
      created_at: user.created_at
    });

    // 2. Поиск всех транзакций пользователя
    console.log('\n2️⃣ ВСЕ ТРАНЗАКЦИИ ПОЛЬЗОВАТЕЛЯ ID 255:');
    const { data: allTx, error: allTxError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 255)
      .order('created_at', { ascending: false });

    if (allTxError) {
      console.log('❌ Ошибка получения транзакций:', allTxError.message);
    } else {
      console.log(`✅ Найдено транзакций: ${allTx?.length || 0}`);
      allTx?.forEach((tx, i) => {
        console.log(`\n📄 Транзакция ${i + 1}:`, {
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          currency: tx.currency,
          status: tx.status,
          tx_hash: tx.tx_hash || 'НЕТ ХЕША',
          created_at: tx.created_at,
          description: tx.description
        });
      });
    }

    // 3. Поиск TON депозитов за последние 24 часа
    console.log('\n3️⃣ ПОИСК TON ДЕПОЗИТОВ ЗА ПОСЛЕДНИЕ 24 ЧАСА:');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: recentTon, error: recentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    if (recentError) {
      console.log('❌ Ошибка поиска депозитов:', recentError.message);
    } else {
      console.log(`✅ Найдено депозитов: ${recentTon?.length || 0}`);
      recentTon?.forEach((dep, i) => {
        console.log(`\n💎 Депозит ${i + 1}:`, {
          user_id: dep.user_id,
          amount: dep.amount,
          status: dep.status,
          tx_hash: dep.tx_hash || 'НЕТ ХЕША',
          created_at: dep.created_at
        });
      });
    }

    // 4. Поиск транзакций с суммами 0.65 и 1.0
    console.log('\n4️⃣ ПОИСК ТРАНЗАКЦИЙ С СУММАМИ 0.65 И 1.0 TON:');
    const { data: targetAmounts, error: targetError } = await supabase
      .from('transactions')
      .select('*')
      .eq('currency', 'TON')
      .in('amount', ['0.65', '1.0', '1', '0.650000', '1.000000'])
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    if (targetError) {
      console.log('❌ Ошибка поиска по суммам:', targetError.message);
    } else {
      console.log(`✅ Найдено транзакций с нужными суммами: ${targetAmounts?.length || 0}`);
      targetAmounts?.forEach((tx, i) => {
        console.log(`\n🎯 Транзакция ${i + 1}:`, {
          user_id: tx.user_id,
          amount: tx.amount,
          type: tx.type,
          status: tx.status,
          tx_hash: tx.tx_hash || 'НЕТ ХЕША',
          created_at: tx.created_at
        });
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎯 ВЫВОДЫ:');
    if (!user) {
      console.log('❌ КРИТИЧНО: Пользователь ID 255 не существует в базе!');
    } else if (!allTx || allTx.length === 0) {
      console.log('❌ ПРОБЛЕМА: У пользователя ID 255 НЕТ транзакций!');
      console.log('   Возможные причины:');
      console.log('   1. Депозиты не обрабатываются системой');
      console.log('   2. Ошибка в webhook обработчике TON депозитов');
      console.log('   3. Проблема с wallet validation');
    } else {
      console.log('✅ Пользователь существует и имеет транзакции');
      const tonDeposits = allTx.filter(tx => tx.type === 'TON_DEPOSIT' && tx.currency === 'TON');
      console.log(`   TON депозитов: ${tonDeposits.length}`);
      console.log(`   Текущий TON баланс: ${user.balance_ton}`);
    }
    console.log('='.repeat(70));

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
  }
}

investigateUser255().catch(console.error);