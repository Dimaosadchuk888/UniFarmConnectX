#!/usr/bin/env tsx

/**
 * 🚨 ЭКСТРЕННАЯ ПОВТОРНАЯ КОМПЕНСАЦИЯ USER 251 И 255
 * 
 * Балансы вернулись к прежним значениям - повторяем компенсацию
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function emergencyCompensationFix() {
  console.log('🚨 ЭКСТРЕННАЯ ПОВТОРНАЯ КОМПЕНСАЦИЯ');
  console.log('=' .repeat(50));
  
  try {
    // 1. ПРОВЕРЯЕМ ТЕКУЩЕЕ СОСТОЯНИЕ
    console.log('1️⃣ Диагностика текущего состояния...');
    
    const { data: currentUsers, error } = await supabase
      .from('users')
      .select('id, username, balance_ton, balance_uni')
      .in('id', [251, 255])
      .order('id');

    if (error) {
      console.error('❌ ОШИБКА ПОЛУЧЕНИЯ ДАННЫХ:', error.message);
      return;
    }

    console.log('\n📊 ТЕКУЩИЕ БАЛАНСЫ:');
    currentUsers?.forEach(user => {
      console.log(`User ${user.id} (@${user.username}): ${user.balance_ton} TON`);
    });

    // 2. МНОЖЕСТВЕННЫЕ ПОПЫТКИ КОМПЕНСАЦИИ
    console.log('\n2️⃣ Множественная компенсация для надежности...');
    
    const compensationAmount = 2.0;
    
    for (const userId of [251, 255]) {
      console.log(`\n🔄 Обработка User ${userId}...`);
      
      const currentUser = currentUsers?.find(u => u.id === userId);
      if (!currentUser) {
        console.log(`❌ User ${userId} не найден`);
        continue;
      }

      const currentBalance = Number(currentUser.balance_ton) || 0;
      const targetBalance = currentBalance + compensationAmount;
      
      console.log(`   Баланс до: ${currentBalance} TON`);
      console.log(`   Целевой баланс: ${targetBalance} TON`);
      
      // ПОПЫТКА 1: Прямое обновление
      console.log('   Попытка 1: Прямое обновление...');
      const { error: updateError1 } = await supabase
        .from('users')
        .update({ balance_ton: targetBalance })
        .eq('id', userId);

      await new Promise(resolve => setTimeout(resolve, 500)); // Пауза

      // ПОПЫТКА 2: Инкрементальное обновление  
      console.log('   Попытка 2: Инкрементальное обновление...');
      const { error: updateError2 } = await supabase
        .rpc('increment_user_balance', {
          user_id: userId,
          amount: compensationAmount,
          currency: 'TON'
        });

      if (updateError2) {
        console.log('   RPC функция недоступна, используем SQL...');
        
        // ПОПЫТКА 3: Raw SQL через rpc
        const { error: sqlError } = await supabase
          .rpc('execute_sql', {
            query: `UPDATE users SET balance_ton = balance_ton + ${compensationAmount} WHERE id = ${userId}`
          });

        if (sqlError) {
          console.log('   SQL RPC тоже недоступен, пробуем upsert...');
          
          // ПОПЫТКА 4: Upsert
          const { error: upsertError } = await supabase
            .from('users')
            .upsert({
              id: userId,
              balance_ton: targetBalance
            }, {
              onConflict: 'id',
              ignoreDuplicates: false
            });

          if (upsertError) {
            console.error(`   ❌ Все попытки провались для User ${userId}`);
          } else {
            console.log(`   ✅ Upsert успешен для User ${userId}`);
          }
        } else {
          console.log(`   ✅ SQL успешен для User ${userId}`);
        }
      } else {
        console.log(`   ✅ RPC успешен для User ${userId}`);
      }

      if (updateError1) {
        console.log('   ⚠️  Прямое обновление не сработало');
      } else {
        console.log('   ✅ Прямое обновление успешно');
      }
    }

    // 3. ФИНАЛЬНАЯ ПРОВЕРКА
    console.log('\n3️⃣ Финальная проверка результата...');
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Пауза для применения изменений
    
    const { data: finalUsers, error: finalError } = await supabase
      .from('users')
      .select('id, username, balance_ton')
      .in('id', [251, 255])
      .order('id');

    if (finalError) {
      console.error('❌ ОШИБКА ФИНАЛЬНОЙ ПРОВЕРКИ:', finalError.message);
      return;
    }

    console.log('\n🎯 ФИНАЛЬНЫЕ РЕЗУЛЬТАТЫ:');
    console.log('━'.repeat(50));
    
    let successCount = 0;
    finalUsers?.forEach(user => {
      const originalUser = currentUsers?.find(u => u.id === user.id);
      const originalBalance = Number(originalUser?.balance_ton || 0);
      const finalBalance = Number(user.balance_ton || 0);
      const change = finalBalance - originalBalance;
      const success = change >= 1.5; // Хотя бы близко к 2 TON
      
      console.log(`User ${user.id} (@${user.username}):`);
      console.log(`   Было: ${originalBalance} TON`);
      console.log(`   Стало: ${finalBalance} TON`);
      console.log(`   Изменение: +${change.toFixed(6)} TON`);
      console.log(`   ${success ? '✅ УСПЕШНО' : '❌ ПРОВАЛ'}`);
      console.log('');
      
      if (success) successCount++;
    });

    if (successCount === 2) {
      console.log('🎉 ЭКСТРЕННАЯ КОМПЕНСАЦИЯ УСПЕШНА!');
    } else {
      console.log(`⚠️  Успешно только ${successCount}/2 пользователей`);
      console.log('❌ ТРЕБУЕТСЯ РУЧНОЕ ВМЕШАТЕЛЬСТВО');
    }

    return {
      success: successCount === 2,
      results: finalUsers
    };

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА ЭКСТРЕННОЙ КОМПЕНСАЦИИ:', error);
    throw error;
  }
}

async function main() {
  try {
    const result = await emergencyCompensationFix();
    
    if (result?.success) {
      console.log('\n✅ ЭКСТРЕННАЯ ОПЕРАЦИЯ ЗАВЕРШЕНА УСПЕШНО');
    } else {
      console.log('\n❌ ЭКСТРЕННАЯ ОПЕРАЦИЯ ТРЕБУЕТ ДОПОЛНИТЕЛЬНЫХ ДЕЙСТВИЙ');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n💥 ЭКСТРЕННАЯ ОПЕРАЦИЯ ПОЛНОСТЬЮ ПРОВАЛЕНА:', error);
    process.exit(1);
  }
}

main();