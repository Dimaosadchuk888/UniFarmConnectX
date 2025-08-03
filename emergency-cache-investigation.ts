#!/usr/bin/env tsx

/**
 * ЭКСТРЕННОЕ РАССЛЕДОВАНИЕ: ПРОБЛЕМА С КЕШИРОВАНИЕМ БАЛАНСА
 * Деньги списываются и возвращаются после покупки TON Boost пакета!
 */

import { supabase } from './core/supabaseClient';
import { BalanceManager } from './core/BalanceManager';

async function emergencyCacheInvestigation() {
  console.log('🚨 ЭКСТРЕННОЕ РАССЛЕДОВАНИЕ КЕШИРОВАНИЯ БАЛАНСА\n');

  try {
    // 1. Проверяем User 25 (DimaOsadchuk) - последние транзакции за 1 час
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentTransactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });

    console.log('⏰ ТРАНЗАКЦИИ USER 25 ЗА ПОСЛЕДНИЙ ЧАС:');
    if (recentTransactions && recentTransactions.length > 0) {
      recentTransactions.forEach((tx, index) => {
        const time = new Date(tx.created_at).toLocaleTimeString();
        console.log(`${index + 1}. [${time}] ${tx.type} | UNI: ${tx.amount_uni} | TON: ${tx.amount_ton}`);
        console.log(`   Описание: ${tx.description}`);
        console.log(`   ID: ${tx.id}`);
      });
    } else {
      console.log('   Транзакций за час не найдено');
    }

    // 2. Проверяем текущий баланс User 25 в БД
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_uni, balance_ton')
      .eq('id', 25)
      .single();

    console.log('\n💰 ТЕКУЩИЙ БАЛАНС USER 25 В БД:');
    if (currentUser) {
      console.log(`UNI: ${currentUser.balance_uni}`);
      console.log(`TON: ${currentUser.balance_ton}`);
    }

    // 3. Проверяем баланс через BalanceManager (с кешем)
    const balanceManager = BalanceManager.getInstance();
    const cachedBalance = await balanceManager.getUserBalance(25);
    
    console.log('\n🗄️ БАЛАНС ЧЕРЕЗ BALANCEMANAGER (с кешем):');
    console.log(JSON.stringify(cachedBalance, null, 2));

    // 4. Ищем все транзакции типа TON_BOOST_PURCHASE за последние 2 часа
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const { data: boostPurchases, error: boostError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .eq('type', 'TON_BOOST_PURCHASE')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false });

    console.log('\n🚀 ПОКУПКИ TON BOOST ЗА ПОСЛЕДНИЕ 2 ЧАСА:');
    if (boostPurchases && boostPurchases.length > 0) {
      boostPurchases.forEach((purchase, index) => {
        const time = new Date(purchase.created_at).toLocaleTimeString();
        console.log(`${index + 1}. [${time}] TON_BOOST_PURCHASE`);
        console.log(`   Списано TON: ${purchase.amount_ton}`);
        console.log(`   Описание: ${purchase.description}`);
        console.log(`   ID транзакции: ${purchase.id}`);
      });
    } else {
      console.log('   Покупок TON Boost за 2 часа не найдено');
    }

    // 5. Ищем возможные возвраты/реверсы
    const { data: possibleReversals, error: reversalError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .gte('created_at', twoHoursAgo)
      .in('type', ['REFUND', 'REVERSAL', 'TON_DEPOSIT', 'CORRECTION'])
      .order('created_at', { ascending: false });

    console.log('\n🔄 ВОЗМОЖНЫЕ ВОЗВРАТЫ/РЕВЕРСЫ ЗА 2 ЧАСА:');
    if (possibleReversals && possibleReversals.length > 0) {
      possibleReversals.forEach((reversal, index) => {
        const time = new Date(reversal.created_at).toLocaleTimeString();
        console.log(`${index + 1}. [${time}] ${reversal.type}`);
        console.log(`   TON: ${reversal.amount_ton} | UNI: ${reversal.amount_uni}`);
        console.log(`   Описание: ${reversal.description}`);
        console.log(`   ID: ${reversal.id}`);
      });
    } else {
      console.log('   Возвратов не найдено');
    }

    // 6. Проверяем активные TON Boost пакеты User 25
    const { data: activeBoosts, error: boostStatusError } = await supabase
      .from('ton_boost_packages')
      .select('*')
      .eq('user_id', 25)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    console.log('\n⚡ АКТИВНЫЕ TON BOOST ПАКЕТЫ:');
    if (activeBoosts && activeBoosts.length > 0) {
      activeBoosts.forEach((boost, index) => {
        console.log(`${index + 1}. Пакет ${boost.package_type} | Стоимость: ${boost.amount_paid} TON`);
        console.log(`   Активен: ${boost.is_active} | Создан: ${boost.created_at}`);
        console.log(`   ID: ${boost.id}`);
      });
    } else {
      console.log('   Активных TON Boost пакетов не найдено');
    }

    // 7. КРИТИЧЕСКИЙ АНАЛИЗ: Ищем дублирующие операции
    const { data: duplicateCheck, error: dupError } = await supabase
      .from('transactions')
      .select('type, amount_ton, amount_uni, created_at, description')
      .eq('user_id', 25)
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: true });

    console.log('\n🔍 АНАЛИЗ НА ДУБЛИРУЮЩИЕ ОПЕРАЦИИ:');
    if (duplicateCheck && duplicateCheck.length > 0) {
      const operationMap = new Map();
      
      duplicateCheck.forEach((tx, index) => {
        const key = `${tx.type}_${tx.amount_ton}_${tx.amount_uni}`;
        if (!operationMap.has(key)) {
          operationMap.set(key, []);
        }
        operationMap.get(key).push({
          index: index + 1,
          time: new Date(tx.created_at).toLocaleTimeString(),
          description: tx.description
        });
      });

      operationMap.forEach((operations, key) => {
        if (operations.length > 1) {
          console.log(`❗ НАЙДЕНЫ ДУБЛИКАТЫ: ${key}`);
          operations.forEach(op => {
            console.log(`   ${op.index}. [${op.time}] ${op.description}`);
          });
        }
      });
    }

    // 8. Проверяем логи BalanceManager для User 25 (симуляция)
    console.log('\n📋 ДИАГНОСТИКА СИСТЕМ КЕШИРОВАНИЯ:');
    console.log('Backend кеш BalanceManager: TTL 5 минут');
    console.log('Frontend кеш balanceService: TTL 15 секунд');
    console.log('WebSocket уведомления: должны инвалидировать кеш');
    console.log('');
    console.log('🔧 ВОЗМОЖНЫЕ ПРИЧИНЫ ПРОБЛЕМЫ:');
    console.log('1. Race condition при одновременных операциях');
    console.log('2. Неправильная инвалидация кеша после покупки');
    console.log('3. Дублирующие транзакции в БД');
    console.log('4. Проблема с WebSocket уведомлениями');
    console.log('5. Ошибка в логике BalanceManager.updateUserBalance()');

  } catch (error) {
    console.error('❌ Ошибка расследования:', error);
  }
}

emergencyCacheInvestigation().catch(console.error);