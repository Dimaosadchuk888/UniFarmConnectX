#!/usr/bin/env tsx

/**
 * 💰 ИСПРАВЛЕННОЕ СИСТЕМНОЕ ЗАЧИСЛЕНИЕ 2 TON ДЛЯ USER 251 И 255
 * 
 * Простое обновление без проблемных полей
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function fixedBalanceCompensation() {
  console.log('💰 ИСПРАВЛЕННОЕ СИСТЕМНОЕ ЗАЧИСЛЕНИЕ USER 251 И 255');
  console.log('=' .repeat(60));
  
  try {
    // 1. ПРОВЕРЯЕМ ТЕКУЩИЕ БАЛАНСЫ
    console.log('1️⃣ Текущие балансы...');
    
    const { data: currentUsers, error: currentError } = await supabase
      .from('users')
      .select('id, username, balance_ton')
      .in('id', [251, 255])
      .order('id');

    if (currentError) {
      console.error('❌ ОШИБКА:', currentError.message);
      return;
    }

    console.log('\n📊 ДО КОМПЕНСАЦИИ:');
    currentUsers?.forEach(user => {
      console.log(`User ${user.id}: ${user.balance_ton} TON`);
    });

    // 2. ОБНОВЛЯЕМ БАЛАНСЫ НАПРЯМУЮ
    console.log('\n2️⃣ Зачислением компенсации...');
    
    // User 251: +2 TON
    const user251Current = currentUsers?.find(u => u.id === 251);
    if (user251Current) {
      const newBalance251 = Number(user251Current.balance_ton) + 2.0;
      
      const { error: error251 } = await supabase
        .from('users')
        .update({ balance_ton: newBalance251 })
        .eq('id', 251);

      if (error251) {
        console.error('❌ ОШИБКА User 251:', error251.message);
      } else {
        console.log(`✅ User 251: ${user251Current.balance_ton} → ${newBalance251} TON (+2)`);
      }
    }

    // User 255: +2 TON  
    const user255Current = currentUsers?.find(u => u.id === 255);
    if (user255Current) {
      const newBalance255 = Number(user255Current.balance_ton) + 2.0;
      
      const { error: error255 } = await supabase
        .from('users')
        .update({ balance_ton: newBalance255 })
        .eq('id', 255);

      if (error255) {
        console.error('❌ ОШИБКА User 255:', error255.message);
      } else {
        console.log(`✅ User 255: ${user255Current.balance_ton} → ${newBalance255} TON (+2)`);
      }
    }

    // 3. ПРОВЕРЯЕМ РЕЗУЛЬТАТ
    console.log('\n3️⃣ Проверка результата...');
    
    const { data: finalUsers, error: finalError } = await supabase
      .from('users')
      .select('id, username, balance_ton')
      .in('id', [251, 255])
      .order('id');

    if (finalError) {
      console.error('❌ ОШИБКА ПРОВЕРКИ:', finalError.message);
      return;
    }

    console.log('\n🎯 ФИНАЛЬНЫЕ БАЛАНСЫ:');
    console.log('━'.repeat(50));
    
    let successCount = 0;
    finalUsers?.forEach(user => {
      const originalUser = currentUsers?.find(u => u.id === user.id);
      const change = Number(user.balance_ton) - Number(originalUser?.balance_ton || 0);
      const success = Math.abs(change - 2.0) < 0.01;
      
      console.log(`User ${user.id} (@${user.username}):`);
      console.log(`   Баланс: ${user.balance_ton} TON`);
      console.log(`   Изменение: +${change.toFixed(6)} TON`);
      console.log(`   ${success ? '✅ УСПЕШНО' : '❌ ОШИБКА'}`);
      console.log('');
      
      if (success) successCount++;
    });

    if (successCount === 2) {
      console.log('🎉 КОМПЕНСАЦИЯ ПОЛНОСТЬЮ УСПЕШНА!');
      console.log('   Оба пользователя получили по 2 TON');
    } else {
      console.log(`⚠️  Успешно: ${successCount}/2 пользователей`);
    }

    return {
      success: successCount === 2,
      compensated: successCount,
      total: 2,
      users: finalUsers
    };
    
  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
    throw error;
  }
}

async function main() {
  try {
    const result = await fixedBalanceCompensation();
    
    console.log('\n✅ ОПЕРАЦИЯ ЗАВЕРШЕНА');
    console.log(`Результат: ${result?.success ? 'УСПЕШНО' : 'ЧАСТИЧНО'}`);
    console.log(`Компенсировано: ${result?.compensated}/${result?.total} пользователей`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ОПЕРАЦИЯ ПРОВАЛЕНА:', error);
    process.exit(1);
  }
}

main();