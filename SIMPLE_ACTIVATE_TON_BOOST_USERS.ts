#!/usr/bin/env tsx

/**
 * 🚀 ПРОСТАЯ АКТИВАЦИЯ TON BOOST ПОЛЬЗОВАТЕЛЕЙ
 * Исправляет системную ошибку - устанавливает ton_boost_active = true
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function activateBoostUsers() {
  console.log('🚀 АКТИВАЦИЯ TON BOOST ПОЛЬЗОВАТЕЛЕЙ');
  console.log('=' .repeat(40));
  
  try {
    // Список всех пользователей с TON Boost покупками
    const userIds = [25, 224, 250, 184, 220, 246, 290, 287, 258];
    
    console.log(`👥 Активируем пользователей: ${userIds.join(', ')}`);
    
    // Активируем всех пользователей одним запросом
    const { data: result, error } = await supabase
      .from('users')
      .update({ ton_boost_active: true })
      .in('id', userIds)
      .select('id, username, ton_boost_active, ton_boost_package');

    if (error) {
      console.error('❌ ОШИБКА:', error.message);
      throw error;
    }

    console.log(`\n✅ АКТИВИРОВАНО: ${result?.length || 0} пользователей`);
    
    result?.forEach(user => {
      console.log(`   User ${user.id} (@${user.username}): Active=${user.ton_boost_active}, Package=${user.ton_boost_package}`);
    });

    // Проверяем готовность для планировщика
    const activeCount = result?.filter(u => u.ton_boost_active && u.ton_boost_package).length || 0;
    console.log(`\n📈 ГОТОВО ДЛЯ ПЛАНИРОВЩИКА: ${activeCount} пользователей`);
    
    return { success: true, activated: result?.length || 0 };

  } catch (error) {
    console.error('💥 ОШИБКА АКТИВАЦИИ:', error);
    throw error;
  }
}

async function main() {
  try {
    const result = await activateBoostUsers();
    
    console.log('\n🎯 РЕЗУЛЬТАТ:');
    console.log(`✅ Активировано: ${result.activated} пользователей`);
    console.log('🎉 СИСТЕМНАЯ ОШИБКА ИСПРАВЛЕНА!');
    console.log('   Планировщик теперь будет обрабатывать всех пользователей');
    
  } catch (error) {
    console.error('\n❌ АКТИВАЦИЯ ПРОВАЛЕНА:', error);
  }
}

main();