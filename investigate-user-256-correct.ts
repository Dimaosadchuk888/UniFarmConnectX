#!/usr/bin/env tsx
/**
 * 🎯 ПРАВИЛЬНОЕ РАССЛЕДОВАНИЕ: Пользователь ID 256 (с TON кошельком)
 * Ищем потерянные депозиты у ПРАВИЛЬНОГО пользователя
 */

import { supabase } from './core/supabase';

async function investigateCorrectUser256() {
  console.log('🎯 ПРАВИЛЬНОЕ РАССЛЕДОВАНИЕ: Пользователь ID 256');
  console.log('='.repeat(70));

  try {
    // 1. Проверяем пользователя ID 256 (с кошельком)
    console.log('\n1️⃣ ПОЛЬЗОВАТЕЛЬ ID 256 (С TON КОШЕЛЬКОМ):');
    const { data: user256, error: user256Error } = await supabase
      .from('users')
      .select('*')
      .eq('id', 256)
      .single();

    if (user256Error || !user256) {
      console.log('❌ Пользователь ID 256 не найден:', user256Error?.message);
      return;
    }

    console.log('✅ Данные пользователя ID 256:', {
      id: user256.id,
      telegram_id: user256.telegram_id,
      username: user256.username,
      ton_wallet_address: user256.ton_wallet_address,
      ton_wallet_verified: user256.ton_wallet_verified,
      balance_ton: user256.balance_ton,
      created_at: user256.created_at
    });

    // 2. Ищем ВСЕ транзакции пользователя ID 256
    console.log('\n2️⃣ ВСЕ ТРАНЗАКЦИИ ПОЛЬЗОВАТЕЛЯ ID 256:');
    const { data: transactions256, error: tx256Error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 256)
      .order('created_at', { ascending: false });

    if (tx256Error) {
      console.log('❌ Ошибка получения транзакций:', tx256Error.message);
    } else {
      console.log(`✅ Найдено транзакций: ${transactions256?.length || 0}`);
      transactions256?.forEach((tx, i) => {
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

    // 3. Поиск депозитов по адресу кошелька пользователя 256
    console.log('\n3️⃣ ПОИСК ДЕПОЗИТОВ ПО АДРЕСУ КОШЕЛЬКА ID 256:');
    const walletAddress = user256.ton_wallet_address;
    
    if (walletAddress) {
      // Поиск по содержанию адреса в description
      const { data: walletDeposits, error: walletError } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'TON_DEPOSIT')
        .ilike('description', `%${walletAddress}%`)
        .order('created_at', { ascending: false });

      if (!walletError && walletDeposits) {
        console.log(`✅ Найдено депозитов по адресу кошелька: ${walletDeposits.length}`);
        walletDeposits.forEach((dep, i) => {
          console.log(`\n💰 Депозит ${i + 1}:`, {
            user_id: dep.user_id,
            amount: dep.amount,
            status: dep.status,
            tx_hash: dep.tx_hash || 'НЕТ ХЕША',
            created_at: dep.created_at,
            description: dep.description.substring(0, 100) + '...'
          });
        });
      }
    }

    // 4. Поиск депозитов с суммами 0.65 и 1.0 с привязкой к неправильному пользователю
    console.log('\n4️⃣ ПОИСК ДЕПОЗИТОВ 0.65/1.0 TON ДРУГИХ ПОЛЬЗОВАТЕЛЕЙ:');
    const { data: targetDeposits, error: targetError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .in('amount', ['0.65', '1.0', '1', '0.650000', '1.000000'])
      .gte('created_at', '2025-08-04T08:00:00.000Z')
      .order('created_at', { ascending: false });

    if (!targetError && targetDeposits) {
      console.log(`✅ Найдено депозитов с нужными суммами: ${targetDeposits.length}`);
      targetDeposits.forEach((dep, i) => {
        console.log(`\n🎯 Депозит ${i + 1}:`, {
          user_id: dep.user_id,
          amount: dep.amount,
          status: dep.status,
          tx_hash: dep.tx_hash || 'НЕТ ХЕША',
          created_at: dep.created_at,
          description: dep.description.substring(0, 100) + '...'
        });
        
        // Проверяем содержит ли description адрес кошелька пользователя 256
        if (walletAddress && dep.description.includes(walletAddress)) {
          console.log(`   🚨 НАЙДЕН! Этот депозит содержит адрес кошелька пользователя 256!`);
          console.log(`   📝 Но привязан к user_id: ${dep.user_id} вместо 256`);
        }
      });
    }

    // 5. Анализ всех депозитов за сегодня на предмет неправильной привязки
    console.log('\n5️⃣ АНАЛИЗ ВСЕХ ДЕПОЗИТОВ НА НЕПРАВИЛЬНУЮ ПРИВЯЗКУ:');
    const { data: allDeposits, error: allError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .gte('created_at', '2025-08-04T08:00:00.000Z')
      .order('created_at', { ascending: false });

    if (!allError && allDeposits && walletAddress) {
      console.log(`✅ Всего депозитов за сегодня: ${allDeposits.length}`);
      
      const misassignedDeposits = allDeposits.filter(dep => 
        dep.description.includes(walletAddress) && dep.user_id !== 256
      );
      
      console.log(`🚨 Депозитов с адресом 256 но неправильной привязкой: ${misassignedDeposits.length}`);
      
      misassignedDeposits.forEach((dep, i) => {
        console.log(`\n⚠️ Неправильно привязанный депозит ${i + 1}:`);
        console.log(`   ID: ${dep.id}`);
        console.log(`   Сумма: ${dep.amount} TON`);
        console.log(`   Привязан к user_id: ${dep.user_id} (должен быть 256)`);
        console.log(`   tx_hash: ${dep.tx_hash || 'НЕТ ХЕША'}`);
        console.log(`   created_at: ${dep.created_at}`);
        console.log(`   description: ${dep.description.substring(0, 200)}...`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎯 ЗАКЛЮЧЕНИЕ:');
    if (user256.ton_wallet_verified) {
      console.log('✅ У пользователя ID 256 есть верифицированный TON кошелек');
      console.log('✅ Система должна была обработать его депозиты');
      console.log('🔍 Проверили привязку депозитов к неправильному пользователю');
    }
    console.log('='.repeat(70));

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
  }
}

investigateCorrectUser256().catch(console.error);