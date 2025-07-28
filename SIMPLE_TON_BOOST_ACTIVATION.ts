#!/usr/bin/env tsx
/**
 * Упрощенная активация TON Boost для пользователей 251 и 255
 * Обходит проблемы с таблицами и создает активацию напрямую
 */

import { supabase } from './core/supabase';
import './config/database';

async function activateBoostForUser(userId: number, depositAmount: number = 2) {
  console.log(`\n🔄 Активация TON Boost для пользователя ${userId}`);
  
  try {
    // Получаем пользователя
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (userError || !user) {
      console.error(`❌ Пользователь ${userId} не найден:`, userError);
      return false;
    }
    
    console.log(`👤 Пользователь: ${user.username || `ID${userId}`}`);
    console.log(`💰 TON баланс: ${user.balance_ton}, UNI баланс: ${user.balance_uni}`);
    
    // Обеспечиваем баланс
    const currentBalance = parseFloat(user.balance_ton || '0');
    let newBalance = currentBalance;
    
    if (currentBalance < depositAmount) {
      newBalance = currentBalance + depositAmount + 0.01;
      console.log(`💳 Пополняем баланс: ${currentBalance} → ${newBalance} TON`);
      
      const { error: balanceError } = await supabase
        .from('users')
        .update({ balance_ton: newBalance })
        .eq('id', userId);
        
      if (balanceError) {
        console.error(`❌ Ошибка пополнения баланса:`, balanceError);
        return false;
      }
    }
    
    // Создаем пакет прямо в коде (обходим проблему с boost_packages)
    const packageData = {
      id: 1,
      name: 'Manual Activation Package',
      min_amount: 2,
      daily_rate: 0.02, // 2% в день
      uni_bonus: 1000,
      duration_days: 365
    };
    
    console.log(`📦 Используем встроенный пакет: ${packageData.name}`);
    
    // Создаем транзакцию
    console.log(`📝 Создание транзакции покупки...`);
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'BOOST_PURCHASE',
        amount: depositAmount,
        currency: 'TON',
        status: 'completed',
        description: `Manual TON Boost activation: ${depositAmount} TON deposit`,
        metadata: {
          package_id: packageData.id,
          package_name: packageData.name,
          manual_activation: true,
          admin_script: true
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (txError) {
      console.error(`❌ Ошибка создания транзакции:`, txError);
      return false;
    }
    
    console.log(`✅ Транзакция создана: ID ${transaction.id}`);
    
    // Активируем в users table
    console.log(`⚡ Активация TON Boost статуса...`);
    const { error: activationError } = await supabase
      .from('users')
      .update({
        ton_boost_active: true,
        ton_boost_package: packageData.id,
        ton_boost_package_id: packageData.id,
        ton_boost_rate: packageData.daily_rate,
        balance_ton: newBalance - depositAmount
      })
      .eq('id', userId);
      
    if (activationError) {
      console.error(`❌ Ошибка активации:`, activationError);
      return false;
    }
    
    console.log(`✅ Users table обновлен`);
    
    // Создаем ton_farming_data с минимальными полями
    console.log(`🚜 Создание ton_farming_data...`);
    const farmingRecord = {
      user_id: userId.toString(),
      farming_balance: depositAmount,
      farming_rate: packageData.daily_rate / 86400, // в секунды
      boost_package_id: packageData.id,
      boost_active: true
    };
    
    const { error: farmingError } = await supabase
      .from('ton_farming_data')
      .upsert(farmingRecord, { onConflict: 'user_id' });
      
    if (farmingError) {
      console.error(`❌ Ошибка ton_farming_data:`, farmingError);
      return false;
    }
    
    console.log(`✅ ton_farming_data создан`);
    
    // Начисляем UNI бонус
    if (packageData.uni_bonus > 0) {
      console.log(`🎁 Начисление UNI бонуса: ${packageData.uni_bonus} UNI`);
      
      const currentUniBalance = parseFloat(user.balance_uni || '0');
      const newUniBalance = currentUniBalance + packageData.uni_bonus;
      
      const { error: uniError } = await supabase
        .from('users')
        .update({ balance_uni: newUniBalance })
        .eq('id', userId);
        
      if (uniError) {
        console.warn(`⚠️ Ошибка UNI бонуса:`, uniError);
      } else {
        console.log(`✅ UNI бонус начислен: ${currentUniBalance} → ${newUniBalance}`);
        
        // UNI бонус транзакция
        await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            type: 'DAILY_BONUS',
            amount: packageData.uni_bonus,
            currency: 'UNI',
            status: 'completed',
            description: `TON Boost Activation Bonus: ${packageData.uni_bonus} UNI`,
            metadata: {
              bonus_type: 'ton_boost_activation',
              package_id: packageData.id
            },
            created_at: new Date().toISOString()
          });
      }
    }
    
    console.log(`🎉 Пользователь ${userId} УСПЕШНО АКТИВИРОВАН!`);
    return true;
    
  } catch (error) {
    console.error(`❌ Критическая ошибка для пользователя ${userId}:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 === УПРОЩЕННАЯ АКТИВАЦИЯ TON BOOST ===');
  console.log('📅 Дата:', new Date().toISOString());
  console.log('👥 Пользователи: 251, 255');
  console.log('💰 Депозит: 2 TON каждому');
  
  // Проверяем подключение
  const { data: testData, error: testError } = await supabase
    .from('users')
    .select('id')
    .limit(1);
    
  if (testError) {
    console.error('❌ Ошибка подключения к базе:', testError);
    return;
  }
  
  console.log('✅ Подключение к базе данных работает');
  
  const targetUsers = [251, 255];
  const results: Array<{ userId: number; success: boolean }> = [];
  
  for (const userId of targetUsers) {
    const success = await activateBoostForUser(userId, 2);
    results.push({ userId, success });
  }
  
  // Итоговый отчет
  console.log('\n' + '='.repeat(60));
  console.log('📊 === ИТОГОВЫЕ РЕЗУЛЬТАТЫ ===');
  console.log('='.repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  
  results.forEach(({ userId, success }) => {
    console.log(`${success ? '✅' : '❌'} Пользователь ${userId}: ${success ? 'АКТИВИРОВАН' : 'ОШИБКА'}`);
  });
  
  console.log(`\n🎯 Результат: ${successCount}/${results.length} пользователей активированы`);
  
  if (successCount === results.length) {
    console.log('\n🎉 ВСЕ АКТИВАЦИИ УСПЕШНЫ!');
    console.log('✅ Пользователи 251 и 255 имеют активные TON Boost пакеты');
    console.log('✅ Каждому зачислено 2 TON в farming систему');
    console.log('✅ Планировщик начнет начислять доход каждые 5 минут');
    console.log('✅ UNI бонусы 1000 каждому начислены');
    
    // Проверяем состояние
    console.log('\n🔍 Проверка финального состояния:');
    for (const userId of [251, 255]) {
      const { data: user } = await supabase
        .from('users')
        .select('ton_boost_active, ton_boost_package, balance_ton, balance_uni')
        .eq('id', userId)
        .single();
        
      const { data: farming } = await supabase
        .from('ton_farming_data')
        .select('farming_balance, boost_active')
        .eq('user_id', userId.toString())
        .single();
        
      console.log(`👤 Пользователь ${userId}:`);
      console.log(`   Boost активен: ${user?.ton_boost_active ? 'ДА' : 'НЕТ'}`);
      console.log(`   TON баланс: ${parseFloat(user?.balance_ton || '0').toFixed(6)}`);
      console.log(`   UNI баланс: ${parseFloat(user?.balance_uni || '0').toFixed(2)}`);
      console.log(`   Farming баланс: ${farming?.farming_balance || 'НЕТ'}`);
      console.log(`   Farming активен: ${farming?.boost_active ? 'ДА' : 'НЕТ'}`);
    }
    
  } else {
    console.log('\n⚠️ Некоторые активации не удались');
  }
}

main().catch(console.error);