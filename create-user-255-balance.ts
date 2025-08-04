#!/usr/bin/env tsx
/**
 * 🛠️ СОЗДАНИЕ ЗАПИСИ БАЛАНСА ДЛЯ USER 255
 * Создаем запись в user_balances с учетом депозитов пользователя
 */

import { supabase } from './core/supabase';

async function createUser255Balance() {
  console.log('🛠️ СОЗДАНИЕ ЗАПИСИ БАЛАНСА ДЛЯ USER 255');
  console.log('='.repeat(80));

  try {
    // 1. Проверяем существует ли пользователь
    console.log('\n1️⃣ ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ:');
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 255)
      .single();
      
    if (userError || !user) {
      console.log('❌ User 255 не найден в таблице users');
      console.log('Ошибка:', userError?.message);
      return;
    }
    
    console.log('✅ User 255 найден:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Telegram ID: ${user.telegram_id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Создан: ${user.created_at}`);
    
    // 2. Проверяем текущую запись баланса
    console.log('\n2️⃣ ПРОВЕРКА ТЕКУЩЕГО БАЛАНСА:');
    
    const { data: existingBalance } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', 255)
      .single();
      
    if (existingBalance) {
      console.log('⚠️ Запись баланса уже существует:');
      console.log(`   UNI: ${existingBalance.uni_balance}`);
      console.log(`   TON: ${existingBalance.ton_balance}`);
      console.log(`   Обновлен: ${existingBalance.updated_at}`);
      console.log('');
      console.log('🤔 Возможно проблема в чем-то другом...');
      return;
    }
    
    console.log('✅ Записи баланса нет - создаем новую');
    
    // 3. Подсчитываем сумму всех TON депозитов User 255
    console.log('\n3️⃣ АНАЛИЗ ДЕПОЗИТОВ USER 255:');
    
    const { data: allDeposits } = await supabase
      .from('transactions')
      .select('amount_ton, created_at, status, description')
      .eq('user_id', 255)
      .in('type', ['DEPOSIT', 'TON_DEPOSIT'])
      .eq('currency', 'TON')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
      
    let totalDeposited = 0;
    if (allDeposits && allDeposits.length > 0) {
      console.log(`📊 Найдено депозитов: ${allDeposits.length}`);
      
      allDeposits.forEach((tx, i) => {
        const amount = parseFloat(tx.amount_ton);
        totalDeposited += amount;
        console.log(`   ${i + 1}. ${amount} TON - ${tx.created_at.slice(0, 19)}`);
      });
      
      console.log(`\n💰 Общая сумма депозитов: ${totalDeposited} TON`);
    } else {
      console.log('📊 Депозитов не найдено');
    }
    
    // 4. Подсчитываем текущие награды
    console.log('\n4️⃣ АНАЛИЗ НАГРАД USER 255:');
    
    const { data: rewards } = await supabase
      .from('transactions')
      .select('amount_ton, amount_uni, currency, type, created_at')
      .eq('user_id', 255)
      .in('type', ['FARMING_REWARD', 'REFERRAL_REWARD', 'DAILY_BONUS', 'MISSION_REWARD'])
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);
      
    let totalUniRewards = 0;
    let totalTonRewards = 0;
    
    if (rewards && rewards.length > 0) {
      console.log(`📊 Найдено наград: ${rewards.length} (показываем последние 20)`);
      
      rewards.forEach((tx) => {
        if (tx.currency === 'UNI' && tx.amount_uni) {
          totalUniRewards += parseFloat(tx.amount_uni);
        } else if (tx.currency === 'TON' && tx.amount_ton) {
          totalTonRewards += parseFloat(tx.amount_ton);
        }
      });
      
      console.log(`\n🎁 Суммарные награды (последние 20):`);
      console.log(`   UNI: ${totalUniRewards.toFixed(6)}`);
      console.log(`   TON: ${totalTonRewards.toFixed(6)}`);
    }
    
    // 5. Создаем запись баланса
    console.log('\n5️⃣ СОЗДАНИЕ ЗАПИСИ БАЛАНСА:');
    
    // Устанавливаем баланс: депозиты + награды
    const uniBalance = totalUniRewards;
    const tonBalance = 2.60; // Как запросил пользователь + totalDeposited + totalTonRewards;
    
    console.log(`\n💰 Создаем баланс:`);
    console.log(`   UNI: ${uniBalance.toFixed(6)} (награды)`);
    console.log(`   TON: ${tonBalance.toFixed(6)} (запрошенная сумма)`);
    
    const { data: newBalance, error: balanceError } = await supabase
      .from('user_balances')
      .insert({
        user_id: 255,
        uni_balance: uniBalance,
        ton_balance: tonBalance,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (balanceError) {
      console.log('❌ Ошибка создания баланса:', balanceError.message);
      return;
    }
    
    console.log('\n✅ БАЛАНС УСПЕШНО СОЗДАН!');
    console.log(`   ID записи: ${newBalance.id}`);
    console.log(`   User ID: ${newBalance.user_id}`);
    console.log(`   UNI баланс: ${newBalance.uni_balance}`);
    console.log(`   TON баланс: ${newBalance.ton_balance}`);
    console.log(`   Создан: ${newBalance.created_at}`);
    
    // 6. Проверяем результат
    console.log('\n6️⃣ ПРОВЕРКА РЕЗУЛЬТАТА:');
    
    const { data: verifyBalance } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', 255)
      .single();
      
    if (verifyBalance) {
      console.log('✅ Запись баланса подтверждена:');
      console.log(`   UNI: ${verifyBalance.uni_balance}`);
      console.log(`   TON: ${verifyBalance.ton_balance}`);
      console.log('');
      console.log('🎉 Теперь User 255 может:');
      console.log('   ✅ Получать TON депозиты');
      console.log('   ✅ Активировать TON Boost');
      console.log('   ✅ Использовать все функции кошелька');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 ЗАДАЧА ВЫПОЛНЕНА УСПЕШНО!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('💥 ОШИБКА СОЗДАНИЯ БАЛАНСА:', error);
  }
}

createUser255Balance().catch(console.error);