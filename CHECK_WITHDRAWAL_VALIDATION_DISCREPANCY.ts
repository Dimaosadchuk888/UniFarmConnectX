#!/usr/bin/env tsx
/**
 * Диагностика несоответствия балансов при валидации вывода средств
 * Проблема: API показывает 3.18 TON, но валидация видит 0.01 TON
 */

import { supabase } from './core/supabase';
import { WalletService } from './modules/wallet/service';
import { SupabaseUserRepository } from './modules/user/service';

const userRepository = new SupabaseUserRepository();
const walletService = new WalletService();

async function checkBalanceDiscrepancy() {
  console.log('\n🔍 ДИАГНОСТИКА НЕСООТВЕТСТВИЯ БАЛАНСОВ ПРИ ВЫВОДЕ');
  console.log('='.repeat(80));
  
  const userId = '184'; // User ID из логов
  
  try {
    // 1. Проверяем баланс через API endpoint
    console.log('\n1️⃣ ПРОВЕРКА ЧЕРЕЗ API ENDPOINT:');
    const user = await userRepository.getUserById(parseInt(userId));
    if (user) {
      console.log(`   balance_ton в БД: ${user.balance_ton} TON`);
      console.log(`   ton_farming_balance: ${user.ton_farming_balance || 'null'}`);
      console.log(`   ton_farming_accumulated: ${user.ton_farming_accumulated || 'null'}`);
    }
    
    // 2. Проверяем баланс напрямую из таблицы users
    console.log('\n2️⃣ ПРЯМОЙ ЗАПРОС К БД:');
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id, username, balance_ton, ton_farming_balance, ton_farming_accumulated, ton_boost_active')
      .eq('id', parseInt(userId))
      .single();
      
    if (dbUser) {
      console.log(`   ID: ${dbUser.id}, Username: ${dbUser.username}`);
      console.log(`   balance_ton: ${dbUser.balance_ton} TON`);
      console.log(`   ton_farming_balance: ${dbUser.ton_farming_balance || 'null'}`);
      console.log(`   ton_farming_accumulated: ${dbUser.ton_farming_accumulated || 'null'}`);
      console.log(`   ton_boost_active: ${dbUser.ton_boost_active}`);
    }
    
    // 3. Проверяем логику валидации из WalletService
    console.log('\n3️⃣ СИМУЛЯЦИЯ ВАЛИДАЦИИ ВЫВОДА:');
    const withdrawAmount = 1; // Попытка вывести 1 TON
    console.log(`   Попытка вывести: ${withdrawAmount} TON`);
    
    // Копируем логику из processWithdrawal
    const currentBalance = parseFloat(dbUser?.balance_ton || "0");
    console.log(`   currentBalance для валидации: ${currentBalance} TON`);
    console.log(`   Проверка: ${currentBalance} >= ${withdrawAmount} ? ${currentBalance >= withdrawAmount ? '✅ ДА' : '❌ НЕТ'}`);
    
    // 4. Проверяем есть ли накопленный farming доход
    console.log('\n4️⃣ ПРОВЕРКА TON FARMING ДАННЫХ:');
    const { data: farmingData } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', parseInt(userId))
      .single();
      
    if (farmingData) {
      console.log(`   farming_balance: ${farmingData.farming_balance} TON`);
      console.log(`   farming_rate: ${farmingData.farming_rate}`);
      console.log(`   boost_active: ${farmingData.boost_active}`);
      console.log(`   last_calculation_time: ${farmingData.last_calculation_time}`);
      
      // Рассчитываем накопленный доход
      if (farmingData.last_calculation_time) {
        const now = new Date();
        const lastCalc = new Date(farmingData.last_calculation_time);
        const hoursPassed = (now.getTime() - lastCalc.getTime()) / (1000 * 60 * 60);
        const accumulatedIncome = parseFloat(farmingData.farming_balance) * parseFloat(farmingData.farming_rate) * hoursPassed / 24;
        console.log(`   Накопленный доход за ${hoursPassed.toFixed(2)} часов: ${accumulatedIncome.toFixed(6)} TON`);
      }
    }
    
    // 5. Проверяем последние транзакции farming reward
    console.log('\n5️⃣ ПОСЛЕДНИЕ FARMING REWARD ТРАНЗАКЦИИ:');
    const { data: farmingRewards } = await supabase
      .from('transactions')
      .select('id, amount_ton, created_at, metadata')
      .eq('user_id', parseInt(userId))
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (farmingRewards && farmingRewards.length > 0) {
      const totalFarmingRewards = farmingRewards.reduce((sum, tx) => sum + parseFloat(tx.amount_ton || '0'), 0);
      console.log(`   Найдено ${farmingRewards.length} транзакций на сумму: ${totalFarmingRewards.toFixed(6)} TON`);
      farmingRewards.forEach(tx => {
        console.log(`   - ${new Date(tx.created_at).toLocaleString()}: ${tx.amount_ton} TON`);
      });
    }
    
    // 6. Итоговый анализ
    console.log('\n6️⃣ ИТОГОВЫЙ АНАЛИЗ:');
    console.log(`   Отображаемый баланс в UI: 3.181141 TON`);
    console.log(`   balance_ton в БД: ${dbUser?.balance_ton || '?'} TON`);
    console.log(`   Разница: ${3.181141 - parseFloat(dbUser?.balance_ton || '0')} TON`);
    
    if (Math.abs(parseFloat(dbUser?.balance_ton || '0') - 0.01) < 0.001) {
      console.log('\n❌ ПРОБЛЕМА ПОДТВЕРЖДЕНА: balance_ton = 0.01, но UI показывает 3.18+');
      console.log('   Накопленный farming доход НЕ добавляется в balance_ton!');
    } else if (Math.abs(parseFloat(dbUser?.balance_ton || '0') - 3.181141) < 0.01) {
      console.log('\n✅ balance_ton в БД соответствует отображаемому балансу');
      console.log('   Проблема может быть в кешировании или race condition');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
  
  process.exit(0);
}

checkBalanceDiscrepancy();