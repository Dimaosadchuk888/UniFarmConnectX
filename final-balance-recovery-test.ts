/**
 * ФИНАЛЬНЫЙ ТЕСТ ВОССТАНОВЛЕНИЯ БАЛАНСОВ
 * Проверяем точное восстановление User 255 и 251
 */

import { supabase } from './core/supabase.js';

async function finalBalanceRecoveryTest() {
  console.log('🎯 ФИНАЛЬНЫЙ ТЕСТ ВОССТАНОВЛЕНИЯ БАЛАНСОВ');
  
  try {
    const { BalanceManager } = await import('./core/BalanceManager.js');
    const balanceManager = BalanceManager.getInstance();
    
    // Ожидаемые значения (из ручного расчета)
    const expectedBalances = {
      255: { uni: 194002.030215, ton: 0.328772 },
      251: { uni: 129192.199781, ton: 0 }
    };
    
    for (const telegramId of [255, 251]) {
      console.log(`\n--- ВОССТАНОВЛЕНИЕ USER ${telegramId} ---`);
      
      // Принудительно пересчитываем баланс
      const validationResult = await balanceManager.validateAndRecalculateBalance(telegramId);
      
      if (validationResult.success) {
        const balance = validationResult.newBalance!;
        const expected = expectedBalances[telegramId];
        
        console.log(`📊 Результат восстановления:`);
        console.log(`   UNI: ${balance.balance_uni} (ожидалось: ${expected.uni})`);
        console.log(`   TON: ${balance.balance_ton} (ожидалось: ${expected.ton})`);
        
        // Проверяем точность
        const uniDiff = Math.abs(balance.balance_uni - expected.uni);
        const tonDiff = Math.abs(balance.balance_ton - expected.ton);
        
        const uniAccurate = uniDiff < 0.01; // Допускаем расхождение в 1 копейку
        const tonAccurate = tonDiff < 0.001; // Допускаем расхождение в 0.001 TON
        
        if (uniAccurate && tonAccurate) {
          console.log(`✅ USER ${telegramId}: ПОЛНОСТЬЮ ВОССТАНОВЛЕН!`);
        } else {
          console.log(`⚠️ USER ${telegramId}: Небольшие расхождения`);
          console.log(`   UNI отклонение: ${uniDiff.toFixed(6)}`);
          if (expected.ton > 0) {
            console.log(`   TON отклонение: ${tonDiff.toFixed(6)}`);
          }
        }
        
        // Проверяем что баланс сохранился в БД
        const { data: userRecord } = await supabase
          .from('users')
          .select('balance_uni, balance_ton')
          .eq('telegram_id', telegramId)
          .single();
        
        if (userRecord) {
          console.log(`📂 Баланс в БД: UNI ${userRecord.balance_uni}, TON ${userRecord.balance_ton}`);
          
          const dbUniMatch = Math.abs(parseFloat(userRecord.balance_uni) - balance.balance_uni) < 0.001;
          const dbTonMatch = Math.abs(parseFloat(userRecord.balance_ton) - balance.balance_ton) < 0.001;
          
          if (dbUniMatch && dbTonMatch) {
            console.log(`✅ Баланс корректно сохранен в БД`);
          } else {
            console.log(`❌ Расхождение с БД!`);
          }
        }
        
      } else {
        console.log(`❌ Ошибка восстановления User ${telegramId}:`, validationResult.error);
      }
    }
    
    // Итоговый отчет
    console.log(`\n📋 ИТОГОВЫЙ ОТЧЕТ:`);
    
    let totalRecovered = 0;
    
    for (const telegramId of [255, 251]) {
      const balanceResult = await balanceManager.getUserBalance(telegramId);
      
      if (balanceResult.success) {
        const balance = balanceResult.balance!;
        console.log(`User ${telegramId}: UNI ${balance.balance_uni.toFixed(6)}, TON ${balance.balance_ton.toFixed(6)}`);
        totalRecovered += balance.balance_uni;
      }
    }
    
    console.log(`\n💰 ОБЩАЯ СУММА ВОССТАНОВЛЕНА: ${totalRecovered.toFixed(6)} UNI`);
    
    // Проверяем что новые операции тоже работают
    console.log(`\n🧪 ТЕСТ НОВЫХ ОПЕРАЦИЙ:`);
    
    // Тестируем hasSufficientBalance
    const sufficientResult = await balanceManager.hasSufficientBalance(255, 1000, 0);
    
    if (sufficientResult.sufficient) {
      console.log(`✅ User 255 имеет достаточно средств (1000 UNI)`);
    } else {
      console.log(`❌ User 255 не имеет достаточно средств`);
    }
    
    console.log(`\n✅ Финальный тест завершен`);
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

finalBalanceRecoveryTest();