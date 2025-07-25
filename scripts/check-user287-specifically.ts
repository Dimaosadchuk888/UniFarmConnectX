#!/usr/bin/env tsx
/**
 * СПЕЦИАЛЬНАЯ ПРОВЕРКА USER 287
 * Выясняем почему он не получил доход в последнем цикле
 */

import { supabase } from '../core/supabase';

async function checkUser287Specifically() {
  console.log('🔍 СПЕЦИАЛЬНАЯ ПРОВЕРКА USER 287');
  console.log('================================');
  console.log(`Время: ${new Date().toLocaleString('ru-RU')}\n`);

  // 1. Проверяем состояние User 287 в farming_data
  console.log('1. 📋 СОСТОЯНИЕ USER 287 В FARMING_DATA:');
  
  const { data: user287Data, error: farmingError } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', '287')
    .single();

  if (farmingError) {
    console.log(`❌ Ошибка получения данных: ${farmingError.message}`);
  } else if (user287Data) {
    console.log(`   ✅ Найден в farming_data:`, {
      user_id: user287Data.user_id,
      type: typeof user287Data.user_id,
      boost_active: user287Data.boost_active,
      farming_balance: user287Data.farming_balance,
      farming_rate: user287Data.farming_rate,
      boost_package_id: user287Data.boost_package_id
    });
  } else {
    console.log('   ❌ НЕ найден в farming_data');
  }

  // 2. Проверяем состояние User 287 в users
  console.log('\n2. 👤 СОСТОЯНИЕ USER 287 В USERS:');
  
  const { data: user287User, error: userError } = await supabase
    .from('users')
    .select('id, balance_ton, balance_uni, ton_boost_package, ton_boost_active')
    .eq('id', 287)
    .single();

  if (userError) {
    console.log(`❌ Ошибка: ${userError.message}`);
  } else if (user287User) {
    console.log(`   ✅ Найден в users:`, {
      id: user287User.id,
      type: typeof user287User.id,
      balance_ton: user287User.balance_ton,
      ton_boost_package: user287User.ton_boost_package,
      ton_boost_active: user287User.ton_boost_active
    });
  }

  // 3. Симуляция планировщика для User 287
  console.log('\n3. 🎯 СИМУЛЯЦИЯ ПЛАНИРОВЩИКА ДЛЯ USER 287:');
  
  if (user287Data && user287User) {
    // Преобразование как в планировщике
    const userId = parseInt(user287Data.user_id.toString());
    console.log(`   Преобразование ID: "${user287Data.user_id}" → ${userId}`);
    console.log(`   ID корректен: ${!isNaN(userId)}`);
    
    // Проверка депозита
    const userDeposit = Math.max(0, parseFloat(user287Data.farming_balance || '0'));
    const dailyRate = user287Data.ton_boost_rate || 0.01;
    const dailyIncome = userDeposit * dailyRate;
    const fiveMinuteIncome = dailyIncome / 288;
    
    console.log(`   Расчет дохода:`);
    console.log(`   • Депозит: ${userDeposit} TON`);
    console.log(`   • Дневная ставка: ${dailyRate} (${(dailyRate * 100).toFixed(1)}%)`);
    console.log(`   • Дневной доход: ${dailyIncome.toFixed(6)} TON`);
    console.log(`   • Доход за 5 минут: ${fiveMinuteIncome.toFixed(6)} TON`);
    console.log(`   • Минимальный порог: 0.0001 TON`);
    console.log(`   • Проходит проверку: ${fiveMinuteIncome > 0.0001 ? 'ДА ✅' : 'НЕТ ❌'}`);
  }

  // 4. Проверяем последние транзакции планировщика
  console.log('\n4. 📊 ПОСЛЕДНИЕ ТРАНЗАКЦИИ ПЛАНИРОВЩИКА:');
  
  const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000).toISOString();
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select('user_id, created_at, amount_ton, description, metadata')
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .gte('created_at', oneMinuteAgo)
    .order('created_at', { ascending: false });

  if (recentTransactions && recentTransactions.length > 0) {
    console.log(`   Транзакций за последнюю минуту: ${recentTransactions.length}`);
    
    const user287Transaction = recentTransactions.find(tx => tx.user_id === 287);
    if (user287Transaction) {
      console.log(`   ✅ User 287 ПОЛУЧИЛ доход:`, {
        amount: user287Transaction.amount_ton,
        time: new Date(user287Transaction.created_at).toLocaleTimeString('ru-RU'),
        description: user287Transaction.description
      });
    } else {
      console.log(`   ❌ User 287 НЕ получил доход в последнем цикле`);
      console.log(`   Пользователи которые получили:`, 
        [...new Set(recentTransactions.map(tx => tx.user_id))].sort()
      );
    }
  } else {
    console.log('   Нет транзакций за последнюю минуту');
  }

  // 5. Рекомендации
  console.log('\n5. 💡 ДИАГНОЗ:');
  console.log('═'.repeat(30));
  
  if (user287Data && user287Data.boost_active) {
    if (user287User && user287User.balance_ton !== undefined) {
      const userDeposit = Math.max(0, parseFloat(user287Data.farming_balance || '0'));
      const fiveMinuteIncome = (userDeposit * 0.01) / 288;
      
      if (fiveMinuteIncome > 0.0001) {
        console.log('✅ User 287 соответствует всем требованиям планировщика');
        console.log('⏳ Должен получить доход в следующем цикле (каждые 5 минут)');
        console.log('🔧 Возможно планировщик обрабатывает пользователей по очереди');
      } else {
        console.log('❌ User 287 не проходит минимальный порог дохода');
        console.log('💡 Депозит слишком мал для генерации значимого дохода');
      }
    } else {
      console.log('❌ Проблема с балансом User 287 в таблице users');
    }
  } else {
    console.log('❌ User 287 не активен или не найден в farming_data');
  }

  console.log('\n✅ Специальная проверка User 287 завершена');
}

// Запуск
checkUser287Specifically()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });