#!/usr/bin/env tsx
/**
 * Диагностика проблемы получения данных для TON Boost
 */

import { TonFarmingRepository } from '../modules/boost/TonFarmingRepository';
import { supabase } from '../core/supabase';

async function diagnoseTonBoostData() {
  console.log('=== ДИАГНОСТИКА ДАННЫХ TON BOOST ===\n');
  
  // 1. Получаем активных пользователей через репозиторий
  const tonFarmingRepo = new TonFarmingRepository();
  const activeBoostUsers = await tonFarmingRepo.getActiveBoostUsers();
  
  console.log(`Найдено активных пользователей: ${activeBoostUsers.length}\n`);
  
  if (activeBoostUsers.length > 0) {
    console.log('Пример возвращаемых данных из getActiveBoostUsers():');
    const firstUser = activeBoostUsers[0];
    console.log('  user_id:', firstUser.user_id);
    console.log('  farming_balance:', firstUser.farming_balance);
    console.log('  farming_rate:', firstUser.farming_rate);
    console.log('  boost_package_id:', firstUser.boost_package_id);
    console.log('  boost_active:', firstUser.boost_active);
    console.log('  Поля balance_ton/balance_uni:', 
      'balance_ton' in firstUser ? firstUser.balance_ton : 'ОТСУТСТВУЮТ');
    
    // 2. Проверяем что планировщик пытается получить
    console.log('\n\nЧто пытается получить планировщик:');
    console.log('  user.balance_ton - НЕ СУЩЕСТВУЕТ в TonFarmingData');
    console.log('  user.balance_uni - НЕ СУЩЕСТВУЕТ в TonFarmingData');
    console.log('  user.ton_boost_package - должно быть boost_package_id');
    console.log('  user.ton_boost_rate - должно быть farming_rate');
    
    // 3. Получаем полные данные пользователя из таблицы users
    console.log('\n\nПолные данные User 74 из таблицы users:');
    const { data: user74, error } = await supabase
      .from('users')
      .select('id, balance_ton, balance_uni, ton_boost_active, ton_boost_package, ton_boost_rate')
      .eq('id', 74)
      .single();
      
    if (user74) {
      console.log('  balance_ton:', user74.balance_ton);
      console.log('  balance_uni:', user74.balance_uni);
      console.log('  ton_boost_package:', user74.ton_boost_package);
      console.log('  ton_boost_rate:', user74.ton_boost_rate);
    }
    
    // 4. Проверяем что происходит в цикле планировщика
    console.log('\n\nПроблема в планировщике (строка 77):');
    console.log('  const userDeposit = Math.max(0, parseFloat(user.balance_ton || "0") - 10);');
    console.log('  ^^^ user.balance_ton = undefined, результат = -10, Math.max = 0');
    console.log('  Поэтому userDeposit = 0 и доход не начисляется!');
    
    // 5. Решение
    console.log('\n\n🔧 РЕШЕНИЕ:');
    console.log('  1. Планировщик должен дополнительно запрашивать balance_ton/balance_uni из users');
    console.log('  2. Или TonFarmingRepository должен возвращать полные данные пользователя');
    console.log('  3. Или использовать farming_balance вместо balance_ton для расчетов');
  }
  
  process.exit(0);
}

diagnoseTonBoostData().catch(console.error);