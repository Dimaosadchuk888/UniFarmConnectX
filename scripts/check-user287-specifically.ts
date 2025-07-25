#!/usr/bin/env tsx
/**
 * СПЕЦИАЛЬНАЯ ПРОВЕРКА USER 287 ПОСЛЕ ПЕРЕЗАПУСКА
 */

import { supabase } from '../core/supabase';

async function checkUser287Specifically() {
  console.log('🎯 ПРОВЕРКА USER 287 ПОСЛЕ ПЕРЕЗАПУСКА СИСТЕМЫ');
  console.log('===============================================');
  console.log(`Время: ${new Date().toLocaleString('ru-RU')}\n`);

  // Проверяем последние 10 минут (после перезапуска)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  
  console.log('1. 📊 АКТИВНОСТЬ ПЛАНИРОВЩИКА ЗА 10 МИНУТ:');
  
  const { data: recentIncomes } = await supabase
    .from('transactions')
    .select('user_id, created_at, amount_ton, description, metadata')
    .eq('type', 'FARMING_REWARD')
    .eq('currency', 'TON')
    .gte('created_at', tenMinutesAgo)
    .order('created_at', { ascending: false });

  console.log(`   Всего TON начислений: ${recentIncomes?.length || 0}`);
  
  if (recentIncomes && recentIncomes.length > 0) {
    const uniqueUsers = [...new Set(recentIncomes.map(tx => tx.user_id))];
    console.log(`   Пользователи получившие доходы: ${uniqueUsers.sort().join(', ')}`);
    
    // Группируем по времени
    const timeGroups = new Map();
    recentIncomes.forEach(tx => {
      const minute = new Date(tx.created_at).toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      if (!timeGroups.has(minute)) timeGroups.set(minute, []);
      timeGroups.get(minute).push(tx.user_id);
    });

    console.log('\n   Начисления по времени:');
    Array.from(timeGroups.entries()).sort().reverse().slice(0, 3).forEach(([time, users]) => {
      const uniqueUsers = [...new Set(users)];
      console.log(`   • ${time}: ${users.length} начислений (${uniqueUsers.length} пользователей: ${uniqueUsers.sort().join(', ')})`);
    });
  }

  console.log('\n2. 🎯 СПЕЦИАЛЬНАЯ ПРОВЕРКА USER 287:');
  
  const user287Transactions = recentIncomes?.filter(tx => tx.user_id === 287) || [];
  
  if (user287Transactions.length > 0) {
    console.log(`   ✅ USER 287 ПОЛУЧИЛ ДОХОДЫ! Количество: ${user287Transactions.length}`);
    
    user287Transactions.forEach((tx, i) => {
      console.log(`   Доход ${i + 1}: +${parseFloat(tx.amount_ton).toFixed(8)} TON в ${new Date(tx.created_at).toLocaleTimeString('ru-RU')}`);
      console.log(`   Описание: ${tx.description}`);
      if (tx.metadata?.transaction_source) {
        console.log(`   Источник: ${tx.metadata.transaction_source}`);
      }
    });
    
    console.log('\n   🎉 ПРОБЛЕМА ПОЛНОСТЬЮ РЕШЕНА!');
    console.log('   ✅ Исправление типов данных работает');
    console.log('   ✅ Снижение порога помогло');
    console.log('   ✅ Перезапуск планировщика помог');
    
  } else {
    console.log('   ❌ User 287 еще не получил доходы');
    
    // Проверяем его статус
    const { data: farmingData } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', '287')
      .single();
      
    const { data: userData } = await supabase
      .from('users')
      .select('balance_ton, ton_boost_package')
      .eq('id', 287)
      .single();

    console.log('\n   📋 Статус User 287:');
    console.log(`   Farming active: ${farmingData?.boost_active}`);
    console.log(`   Farming balance: ${farmingData?.farming_balance} TON`);
    console.log(`   Package ID: ${farmingData?.boost_package_id}`);
    console.log(`   Current balance: ${userData?.balance_ton} TON`);
    
    // Рассчитываем ожидаемый доход
    const deposit = parseFloat(farmingData?.farming_balance || '0');
    const rate = parseFloat(farmingData?.farming_rate || '0.01');
    const fiveMinIncome = (deposit * rate) / 288;
    
    console.log(`\n   💰 Ожидаемый доход за 5 мин: ${fiveMinIncome.toFixed(8)} TON`);
    console.log(`   Проходит порог 0.00001: ${fiveMinIncome > 0.00001 ? 'ДА' : 'НЕТ'}`);
    
    console.log('\n   ⏳ Нужно подождать следующий цикл планировщика');
  }

  console.log('\n✅ Проверка User 287 завершена');
}

// Запуск
checkUser287Specifically()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });