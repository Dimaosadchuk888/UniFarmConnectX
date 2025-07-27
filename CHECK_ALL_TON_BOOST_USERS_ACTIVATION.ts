#!/usr/bin/env tsx

/**
 * 🚨 ПОЛНАЯ ПРОВЕРКА ВСЕХ ПОЛЬЗОВАТЕЛЕЙ С TON BOOST ПОКУПКАМИ
 * Ищем всех, кто купил пакеты но не получает начисления
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function checkAllBoostUsers() {
  console.log('🚨 ПОЛНАЯ ПРОВЕРКА ВСЕХ TON BOOST ПОЛЬЗОВАТЕЛЕЙ');
  console.log('=' .repeat(55));
  
  try {
    // 1. НАХОДИМ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ С BOOST_PURCHASE
    console.log('1️⃣ Поиск всех пользователей с BOOST_PURCHASE...');
    
    const { data: allBoostPurchases } = await supabase
      .from('transactions')
      .select('user_id, created_at, amount')
      .eq('type', 'BOOST_PURCHASE')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (!allBoostPurchases || allBoostPurchases.length === 0) {
      console.log('❌ Не найдено BOOST_PURCHASE транзакций');
      return;
    }

    // Получаем уникальных пользователей
    const uniqueUserIds = [...new Set(allBoostPurchases.map(tx => parseInt(tx.user_id)))];
    console.log(`💰 ВСЕГО пользователей с покупками: ${uniqueUserIds.length}`);
    console.log(`💳 ВСЕГО транзакций BOOST_PURCHASE: ${allBoostPurchases.length}`);

    // 2. ПРОВЕРЯЕМ СТАТУС АКТИВАЦИИ ДЛЯ ВСЕХ
    console.log('\n2️⃣ Проверка статуса активации для всех пользователей...');
    
    const { data: usersStatus } = await supabase
      .from('users')
      .select('id, username, ton_boost_active, ton_boost_package, ton_boost_rate, balance_ton')
      .in('id', uniqueUserIds)
      .order('id');

    // 3. ПРОВЕРЯЕМ НАЛИЧИЕ В TON_FARMING_DATA
    console.log('\n3️⃣ Проверка записей в ton_farming_data...');
    
    const { data: farmingData } = await supabase
      .from('ton_farming_data')
      .select('user_id, farming_balance, farming_rate, boost_package_id, created_at')
      .in('user_id', uniqueUserIds.map(id => id.toString()))
      .order('user_id');

    const farmingUserIds = farmingData?.map(d => parseInt(d.user_id)) || [];

    // 4. АНАЛИЗ КАЖДОГО ПОЛЬЗОВАТЕЛЯ
    console.log('\n4️⃣ ДЕТАЛЬНЫЙ АНАЛИЗ ПО КАЖДОМУ ПОЛЬЗОВАТЕЛЮ:');
    console.log('=' .repeat(55));

    const problems = [];
    const inactive_users = [];
    const missing_farming_data = [];
    const working_correctly = [];

    for (const userId of uniqueUserIds) {
      const user = usersStatus?.find(u => u.id === userId);
      const hasFarmingData = farmingUserIds.includes(userId);
      const purchaseCount = allBoostPurchases.filter(tx => parseInt(tx.user_id) === userId).length;
      const lastPurchase = allBoostPurchases.find(tx => parseInt(tx.user_id) === userId)?.created_at;

      console.log(`\n👤 User ${userId} (@${user?.username || 'unknown'}):`);
      console.log(`   💰 Покупок: ${purchaseCount}`);
      console.log(`   📅 Последняя покупка: ${lastPurchase}`);
      console.log(`   💳 Баланс TON: ${user?.balance_ton || 0}`);
      console.log(`   📦 Пакет: ${user?.ton_boost_package || 'НЕТ'}`);
      console.log(`   ⚡ Активен: ${user?.ton_boost_active ? 'ДА' : 'НЕТ'}`);
      console.log(`   🌾 В ton_farming_data: ${hasFarmingData ? 'ДА' : 'НЕТ'}`);

      // Определяем статус проблемы
      if (!user?.ton_boost_active) {
        console.log(`   🚨 ПРОБЛЕМА: НЕ АКТИВИРОВАН - не получает доходы!`);
        inactive_users.push(userId);
        problems.push(`User ${userId}: ton_boost_active = false`);
      }

      if (!hasFarmingData) {
        console.log(`   🚨 ПРОБЛЕМА: НЕТ в ton_farming_data - планировщик не видит!`);
        missing_farming_data.push(userId);
        problems.push(`User ${userId}: отсутствует в ton_farming_data`);
      }

      if (user?.ton_boost_active && hasFarmingData) {
        console.log(`   ✅ РАБОТАЕТ КОРРЕКТНО - получает доходы`);
        working_correctly.push(userId);
      }
    }

    // 5. СВОДКА ПРОБЛЕМ
    console.log('\n5️⃣ СВОДКА ПРОБЛЕМ:');
    console.log('=' .repeat(30));
    
    console.log(`\n📊 СТАТИСТИКА:`);
    console.log(`   - Всего пользователей с покупками: ${uniqueUserIds.length}`);
    console.log(`   - Работают корректно: ${working_correctly.length}`);
    console.log(`   - НЕ активированы (ton_boost_active=false): ${inactive_users.length}`);
    console.log(`   - НЕТ в ton_farming_data: ${missing_farming_data.length}`);
    console.log(`   - Всего с проблемами: ${inactive_users.length + missing_farming_data.length - (inactive_users.filter(id => missing_farming_data.includes(id)).length)}`);

    if (inactive_users.length > 0) {
      console.log(`\n❌ НЕАКТИВНЫЕ ПОЛЬЗОВАТЕЛИ (ton_boost_active=false):`);
      console.log(`   ${inactive_users.join(', ')}`);
      console.log(`   👆 НУЖНО: UPDATE users SET ton_boost_active = true WHERE id IN (${inactive_users.join(', ')});`);
    }

    if (missing_farming_data.length > 0) {
      console.log(`\n❌ ОТСУТСТВУЮТ В TON_FARMING_DATA:`);
      console.log(`   ${missing_farming_data.join(', ')}`);
      console.log(`   👆 НУЖНО: Создать записи в ton_farming_data для этих пользователей`);
    }

    if (working_correctly.length > 0) {
      console.log(`\n✅ РАБОТАЮТ КОРРЕКТНО:`);
      console.log(`   ${working_correctly.join(', ')}`);
    }

    // 6. ПРОВЕРКА ПОСЛЕДНИХ ДОХОДОВ
    console.log('\n6️⃣ Проверка последних доходов от планировщика...');
    
    const { data: recentIncomes } = await supabase
      .from('transactions')
      .select('user_id, amount, created_at')
      .eq('type', 'FARMING_REWARD')
      .contains('metadata', { transaction_source: 'ton_boost_scheduler' })
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // 2 часа назад
      .order('created_at', { ascending: false });

    const usersWithRecentIncome = [...new Set(recentIncomes?.map(tx => parseInt(tx.user_id)) || [])];
    console.log(`📈 Пользователей с доходами за 2 часа: ${usersWithRecentIncome.length}`);
    
    const notReceivingIncome = uniqueUserIds.filter(id => !usersWithRecentIncome.includes(id));
    if (notReceivingIncome.length > 0) {
      console.log(`\n⚠️  НЕ ПОЛУЧАЮТ ДОХОДЫ от планировщика:`);
      console.log(`   ${notReceivingIncome.join(', ')}`);
    }

    return {
      total_users_with_purchases: uniqueUserIds.length,
      inactive_users: inactive_users,
      missing_farming_data: missing_farming_data,
      working_correctly: working_correctly.length,
      not_receiving_income: notReceivingIncome.length
    };

  } catch (error) {
    console.error('💥 ОШИБКА АНАЛИЗА:', error);
    throw error;
  }
}

async function main() {
  try {
    const result = await checkAllBoostUsers();
    
    console.log('\n🎯 ФИНАЛЬНЫЕ РЕКОМЕНДАЦИИ:');
    console.log('=' .repeat(30));
    
    if (result.inactive_users.length > 0) {
      console.log(`\n1. АКТИВИРОВАТЬ ПОЛЬЗОВАТЕЛЕЙ: ${result.inactive_users.join(', ')}`);
      console.log(`   SQL: UPDATE users SET ton_boost_active = true WHERE id IN (${result.inactive_users.join(', ')});`);
    }
    
    if (result.missing_farming_data.length > 0) {
      console.log(`\n2. СОЗДАТЬ ЗАПИСИ В TON_FARMING_DATA для: ${result.missing_farming_data.join(', ')}`);
    }
    
    console.log(`\n✅ После исправления планировщик будет работать для всех ${result.total_users_with_purchases} пользователей`);
    
  } catch (error) {
    console.error('\n❌ ПРОВЕРКА ПРОВАЛЕНА:', error);
  }
}

main();