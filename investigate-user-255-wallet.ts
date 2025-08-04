#!/usr/bin/env tsx
/**
 * 🔍 РАССЛЕДОВАНИЕ: TON кошелек пользователя ID 255
 * Проверяем кошелек и ищем необработанные депозиты
 */

import { supabase } from './core/supabase';

async function investigateUser255Wallet() {
  console.log('🔍 РАССЛЕДОВАНИЕ: TON кошелек пользователя ID 255');
  console.log('='.repeat(70));

  try {
    // 1. Получаем данные кошелька пользователя 255
    console.log('\n1️⃣ TON КОШЕЛЕК ПОЛЬЗОВАТЕЛЯ ID 255:');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, username, ton_wallet_address, ton_wallet_verified, balance_ton, created_at')
      .eq('id', 255)
      .single();

    if (userError || !user) {
      console.log('❌ Не удалось получить данные пользователя:', userError?.message);
      return;
    }

    console.log('✅ Данные кошелька:', {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      ton_wallet_address: user.ton_wallet_address || 'НЕ УСТАНОВЛЕН',
      ton_wallet_verified: user.ton_wallet_verified || false,
      balance_ton: user.balance_ton,
      created_at: user.created_at
    });

    // 2. Проверяем TON депозиты для этого адреса кошелька (если есть)
    if (user.ton_wallet_address) {
      console.log('\n2️⃣ ПОИСК ДЕПОЗИТОВ ПО АДРЕСУ КОШЕЛЬКА:');
      
      // Проверяем в таблице transactions
      const { data: walletDeposits, error: walletError } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'TON_DEPOSIT')
        .ilike('description', `%${user.ton_wallet_address}%`)
        .order('created_at', { ascending: false });

      if (walletError) {
        console.log('❌ Ошибка поиска по адресу:', walletError.message);
      } else {
        console.log(`✅ Найдено депозитов по адресу: ${walletDeposits?.length || 0}`);
        walletDeposits?.forEach((dep, i) => {
          console.log(`\n💰 Депозит ${i + 1}:`, {
            user_id: dep.user_id,
            amount: dep.amount,
            status: dep.status,
            tx_hash: dep.tx_hash || 'НЕТ ХЕША',
            created_at: dep.created_at,
            description: dep.description
          });
        });
      }
    } else {
      console.log('\n2️⃣ ❌ У ПОЛЬЗОВАТЕЛЯ НЕТ TON КОШЕЛЬКА!');
      console.log('   Это может быть причиной проблемы - депозиты не могут быть связаны с пользователем');
    }

    // 3. Поиск TON депозитов с суммами 0.65 и 1.0 за последние 2 часа
    console.log('\n3️⃣ ПОИСК ДЕПОЗИТОВ 0.65 И 1.0 TON ЗА ПОСЛЕДНИЕ 2 ЧАСА:');
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    const { data: recentTargetDeposits, error: recentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .eq('currency', 'TON')
      .in('amount', ['0.65', '1.0', '1', '0.650000', '1.000000'])
      .gte('created_at', twoHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (recentError) {
      console.log('❌ Ошибка поиска недавних депозитов:', recentError.message);
    } else {
      console.log(`✅ Найдено недавних депозитов с нужными суммами: ${recentTargetDeposits?.length || 0}`);
      recentTargetDeposits?.forEach((dep, i) => {
        console.log(`\n🎯 Недавний депозит ${i + 1}:`, {
          user_id: dep.user_id,
          amount: dep.amount,
          status: dep.status,
          tx_hash: dep.tx_hash || 'НЕТ ХЕША',
          created_at: dep.created_at,
          description: dep.description
        });
      });
    }

    // 4. Поиск необработанных или зависших депозитов
    console.log('\n4️⃣ ПОИСК НЕОБРАБОТАННЫХ ДЕПОЗИТОВ:');
    const { data: pendingDeposits, error: pendingError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .neq('status', 'completed')
      .gte('created_at', twoHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (pendingError) {
      console.log('❌ Ошибка поиска необработанных:', pendingError.message);
    } else {
      console.log(`✅ Найдено необработанных депозитов: ${pendingDeposits?.length || 0}`);
      pendingDeposits?.forEach((dep, i) => {
        console.log(`\n⏳ Необработанный депозит ${i + 1}:`, {
          user_id: dep.user_id,
          amount: dep.amount,
          status: dep.status,
          tx_hash: dep.tx_hash || 'НЕТ ХЕША',
          created_at: dep.created_at,
          description: dep.description
        });
      });
    }

    // 5. Анализ админского кошелька - поиск входящих транзакций
    console.log('\n5️⃣ АНАЛИЗ ВХОДЯЩИХ TON НА АДМИНСКИЙ КОШЕЛЕК:');
    console.log('   Проверяем получены ли 1.65 TON на админский кошелек...');
    
    // Поиск всех депозитов за последние 2 часа для анализа
    const { data: allRecentDeposits, error: allRecentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .gte('created_at', twoHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (allRecentError) {
      console.log('❌ Ошибка получения всех депозитов:', allRecentError.message);
    } else {
      console.log(`✅ Всего депозитов за 2 часа: ${allRecentDeposits?.length || 0}`);
      
      const totalAmount = allRecentDeposits?.reduce((sum, dep) => sum + parseFloat(dep.amount || '0'), 0) || 0;
      console.log(`   Общая сумма депозитов: ${totalAmount.toFixed(6)} TON`);
      
      // Группируем по пользователям
      const byUsers = allRecentDeposits?.reduce((acc, dep) => {
        const userId = dep.user_id;
        if (!acc[userId]) acc[userId] = [];
        acc[userId].push(dep);
        return acc;
      }, {} as Record<number, any[]>) || {};
      
      console.log('\n   📊 Депозиты по пользователям:');
      Object.entries(byUsers).forEach(([userId, deposits]) => {
        const userTotal = deposits.reduce((sum, dep) => sum + parseFloat(dep.amount || '0'), 0);
        console.log(`   - Пользователь ${userId}: ${deposits.length} депозитов, ${userTotal.toFixed(6)} TON`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎯 ВЫВОДЫ РАССЛЕДОВАНИЯ:');
    
    if (!user.ton_wallet_address) {
      console.log('❌ КРИТИЧНО: У пользователя ID 255 НЕТ TON кошелька!');
      console.log('   Депозиты не могут быть автоматически связаны с аккаунтом');
      console.log('   Решение: пользователь должен подключить TON кошелек в приложении');
    } else if (!user.ton_wallet_verified) {
      console.log('⚠️  ПРОБЛЕМА: TON кошелек не верифицирован!');
      console.log('   Депозиты могут не обрабатываться');
    } else {
      console.log('✅ TON кошелек установлен и верифицирован');
      console.log('   Нужно проверить webhook обработчик депозитов');
    }
    
    console.log('\n🔧 РЕКОМЕНДАЦИИ:');
    console.log('1. Проверить подключен ли TON кошелек у пользователя 255');
    console.log('2. Проверить логи webhook обработчика TON депозитов');
    console.log('3. Проверить поступили ли 1.65 TON на админский кошелек');
    console.log('4. При необходимости - восстановить депозиты вручную');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
  }
}

investigateUser255Wallet().catch(console.error);