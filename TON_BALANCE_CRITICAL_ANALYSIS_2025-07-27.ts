#!/usr/bin/env tsx
/**
 * КРИТИЧЕСКИЙ АНАЛИЗ TON БАЛАНСА - ОБНАРУЖЕНЫ СЕРЬЕЗНЫЕ ПРОБЛЕМЫ
 * 27 июля 2025 - Детальное расследование аномалий
 */

import { supabase } from './core/supabase';

async function criticalTonBalanceAnalysis() {
  console.log('🚨 КРИТИЧЕСКИЙ АНАЛИЗ TON БАЛАНСА - ОБНАРУЖЕНЫ АНОМАЛИИ');
  console.log('=' .repeat(80));

  try {
    // Анализ конкретных пользователей с аномалиями
    const problematicUsers = [185, 187, 188, 189, 190];
    
    for (const userId of problematicUsers) {
      console.log(`\n🔍 ДЕТАЛЬНЫЙ АНАЛИЗ ПОЛЬЗОВАТЕЛЯ ${userId}:`);
      await analyzeProblematicUser(userId);
    }

    // Поиск паттернов дублирования
    console.log('\n🔄 ПОИСК ДУБЛИРОВАНИЯ ТРАНЗАКЦИЙ:');
    await findDuplicatePatterns();

    // Анализ TON Boost операций
    console.log('\n📦 АНАЛИЗ TON BOOST ОПЕРАЦИЙ:');
    await analyzeTonBoostOperations();

  } catch (error) {
    console.error('❌ Ошибка критического анализа:', error);
  }
}

async function analyzeProblematicUser(userId: number) {
  // Получаем данные пользователя
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  console.log(`   💰 DB баланс: ${user.balance_ton} TON`);
  console.log(`   📦 TON Boost: ${user.ton_boost_package || 'нет'}, ставка: ${user.ton_boost_rate || 0}`);

  // Все TON транзакции пользователя
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('currency', 'TON')
    .order('created_at', { ascending: true });

  console.log(`   📊 Всего TON транзакций: ${transactions?.length || 0}`);

  let calculatedBalance = 0;
  const operationsByType: { [key: string]: number } = {};

  transactions?.forEach((tx, index) => {
    const amount = parseFloat(tx.amount);
    operationsByType[tx.type] = (operationsByType[tx.type] || 0) + 1;

    if (['TON_DEPOSIT', 'FARMING_REWARD'].includes(tx.type)) {
      calculatedBalance += amount;
      console.log(`   ${index + 1}. ✅ +${amount} TON (${tx.type}) - ${tx.description?.slice(0, 50) || 'без описания'}`);
    } else if (['BOOST_PURCHASE', 'WITHDRAWAL'].includes(tx.type)) {
      calculatedBalance -= amount;
      console.log(`   ${index + 1}. ❌ -${amount} TON (${tx.type}) - ${tx.description?.slice(0, 50) || 'без описания'}`);
    } else {
      console.log(`   ${index + 1}. ❓ ${amount} TON (${tx.type}) - НЕИЗВЕСТНЫЙ ТИП`);
    }

    // Показываем время и метаданные для подозрительных операций
    if (amount > 1) {
      console.log(`      ⏰ Время: ${tx.created_at}`);
      if (tx.metadata) {
        try {
          const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
          console.log(`      📝 Metadata: ${JSON.stringify(metadata, null, 2).slice(0, 200)}`);
        } catch (e) {
          console.log(`      📝 Raw metadata: ${JSON.stringify(tx.metadata).slice(0, 100)}`);
        }
      }
    }
  });

  console.log(`   📈 Операции по типам: ${JSON.stringify(operationsByType, null, 2)}`);
  console.log(`   💎 Расчетный баланс: ${calculatedBalance.toFixed(6)} TON`);
  console.log(`   ⚠️  Разница с DB: ${Math.abs(user.balance_ton - calculatedBalance).toFixed(6)} TON`);

  if (Math.abs(user.balance_ton - calculatedBalance) > 0.01) {
    console.log(`   🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: Баланс не соответствует транзакциям!`);
    
    // Проверяем TON Farming данные
    const { data: tonFarming } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', userId.toString());

    if (tonFarming?.length) {
      console.log(`   🌱 TON Farming баланс: ${tonFarming[0].farming_balance} TON`);
      console.log(`   🔄 Возможная причина: Дублирование через TON Farming систему`);
    }
  }
}

async function findDuplicatePatterns() {
  // Поиск транзакций с одинаковыми суммами в близкое время
  const { data: recentTx } = await supabase
    .from('transactions')
    .select('*')
    .eq('currency', 'TON')
    .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  const duplicateGroups = new Map();
  
  recentTx?.forEach(tx => {
    const key = `${tx.user_id}-${tx.amount}-${tx.type}`;
    if (!duplicateGroups.has(key)) {
      duplicateGroups.set(key, []);
    }
    duplicateGroups.get(key).push(tx);
  });

  duplicateGroups.forEach((txGroup, key) => {
    if (txGroup.length > 1) {
      console.log(`   🔄 Потенциальные дубли для ${key}:`);
      txGroup.forEach((tx: any) => {
        console.log(`      ${tx.id}: ${tx.created_at} - ${tx.description?.slice(0, 50) || 'без описания'}`);
      });
      
      // Проверяем временные интервалы
      for (let i = 0; i < txGroup.length - 1; i++) {
        const timeDiff = (new Date(txGroup[i + 1].created_at).getTime() - new Date(txGroup[i].created_at).getTime()) / 1000;
        if (timeDiff < 300) { // Менее 5 минут
          console.log(`      ⚠️  Подозрительный интервал: ${timeDiff.toFixed(1)} сек между операциями`);
        }
      }
    }
  });
}

async function analyzeTonBoostOperations() {
  // Анализ TON Boost покупок за последние дни
  const { data: boostPurchases } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'BOOST_PURCHASE')
    .eq('currency', 'TON')
    .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  console.log(`   📦 TON Boost покупок за 3 дня: ${boostPurchases?.length || 0}`);

  const userPurchases = new Map();
  boostPurchases?.forEach(purchase => {
    if (!userPurchases.has(purchase.user_id)) {
      userPurchases.set(purchase.user_id, []);
    }
    userPurchases.get(purchase.user_id).push(purchase);
  });

  // Анализируем пользователей с множественными покупками
  userPurchases.forEach((purchases, userId) => {
    if (purchases.length > 1) {
      console.log(`   👤 User ${userId}: ${purchases.length} TON Boost покупок`);
      purchases.forEach((purchase: any, index: number) => {
        console.log(`      ${index + 1}. ${purchase.amount} TON - ${purchase.created_at}`);
        
        // Ищем компенсирующие FARMING_REWARD
        setTimeout(async () => {
          const { data: rewards } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .eq('type', 'FARMING_REWARD')
            .eq('currency', 'TON')
            .eq('amount', purchase.amount)
            .gte('created_at', purchase.created_at)
            .lte('created_at', new Date(new Date(purchase.created_at).getTime() + 30 * 60 * 1000).toISOString());

          if (rewards?.length) {
            console.log(`        🔄 Найдено ${rewards.length} FARMING_REWARD операций с той же суммой в течение 30 мин`);
          }
        }, 100);
      });
    }
  });

  // Проверяем конкретные проблемные случаи
  await analyzeSpecificBoostIssues();
}

async function analyzeSpecificBoostIssues() {
  console.log(`\n🎯 АНАЛИЗ КОНКРЕТНЫХ ПРОБЛЕМ TON BOOST:`);

  // Поиск операций где покупка и возврат происходят одновременно
  const { data: suspiciousPatterns } = await supabase
    .from('transactions')
    .select('*')
    .eq('currency', 'TON')
    .in('type', ['BOOST_PURCHASE', 'FARMING_REWARD'])
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('user_id, created_at');

  const userTimeline = new Map();
  suspiciousPatterns?.forEach(tx => {
    if (!userTimeline.has(tx.user_id)) {
      userTimeline.set(tx.user_id, []);
    }
    userTimeline.get(tx.user_id).push(tx);
  });

  userTimeline.forEach((timeline, userId) => {
    for (let i = 0; i < timeline.length - 1; i++) {
      const current = timeline[i];
      const next = timeline[i + 1];
      
      if (current.type === 'BOOST_PURCHASE' && next.type === 'FARMING_REWARD' && 
          current.amount === next.amount) {
        const timeDiff = (new Date(next.created_at).getTime() - new Date(current.created_at).getTime()) / 1000;
        if (timeDiff < 60) { // Менее минуты
          console.log(`   🚨 User ${userId}: BOOST_PURCHASE -${current.amount} TON сразу компенсируется FARMING_REWARD +${next.amount} TON через ${timeDiff.toFixed(1)}сек`);
          console.log(`      Purchase: ${current.created_at}`);
          console.log(`      Reward: ${next.created_at}`);
          console.log(`      Description: ${current.description || 'нет'} / ${next.description || 'нет'}`);
        }
      }
    }
  });
}

// Запуск критического анализа
criticalTonBalanceAnalysis()
  .then(() => {
    console.log('\n🎯 Критический анализ завершен');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Ошибка критического анализа:', error);
    process.exit(1);
  });