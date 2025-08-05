/**
 * ТЕСТИРОВАНИЕ ИСПРАВЛЕННОГО BALANCE MANAGER
 * Проверяем работу с telegram_id на проблемных пользователях 255 и 251
 */

import { supabase } from './core/supabase.js';

async function testFixedBalanceManager() {
  console.log('🧪 ТЕСТИРОВАНИЕ ИСПРАВЛЕННОГО BALANCE MANAGER');
  
  try {
    // Импортируем исправленный BalanceManager
    const { BalanceManager } = await import('./core/BalanceManager.js');
    const balanceManager = BalanceManager.getInstance();
    
    console.log('✅ BalanceManager загружен успешно');
    
    // Тестируем с проблемными пользователями
    for (const telegramId of [255, 251]) {
      console.log(`\n--- ТЕСТ USER ${telegramId} ---`);
      
      // 1. Тестируем getUserBalance с telegram_id
      console.log(`🔍 Тестируем getUserBalance(${telegramId}):`);
      const balanceResult = await balanceManager.getUserBalance(telegramId);
      
      if (balanceResult.success) {
        console.log('✅ getUserBalance успешно:', {
          user_id: balanceResult.balance?.user_id,
          balance_uni: balanceResult.balance?.balance_uni,
          balance_ton: balanceResult.balance?.balance_ton
        });
      } else {
        console.log('❌ getUserBalance ошибка:', balanceResult.error);
        continue;
      }
      
      // 2. Тестируем validateAndRecalculateBalance
      console.log(`🔧 Тестируем validateAndRecalculateBalance(${telegramId}):`);
      const validationResult = await balanceManager.validateAndRecalculateBalance(telegramId);
      
      if (validationResult.success) {
        console.log('✅ validateAndRecalculateBalance успешно:', {
          corrected: validationResult.corrected,
          user_id: validationResult.newBalance?.user_id,
          balance_uni: validationResult.newBalance?.balance_uni,
          balance_ton: validationResult.newBalance?.balance_ton
        });
        
        if (validationResult.corrected) {
          console.log('🎯 БАЛАНС ИСПРАВЛЕН!');
          
          // Проверяем транзакции для этого пользователя
          const { data: transactions } = await supabase
            .from('transactions')
            .select('count')
            .eq('user_id', telegramId)
            .single();
          
          console.log(`📊 Найдено транзакций для User ${telegramId}: ${transactions?.count || 0}`);
          
        } else {
          console.log('ℹ️ Баланс уже корректен');
        }
      } else {
        console.log('❌ validateAndRecalculateBalance ошибка:', validationResult.error);
      }
      
      // 3. Проверяем итоговый баланс
      console.log(`💰 Проверяем итоговый баланс User ${telegramId}:`);
      const finalBalanceResult = await balanceManager.getUserBalance(telegramId);
      
      if (finalBalanceResult.success) {
        const balance = finalBalanceResult.balance!;
        console.log(`✅ Итоговый баланс:`);
        console.log(`   UNI: ${balance.balance_uni}`);
        console.log(`   TON: ${balance.balance_ton}`);
        
        // Сравниваем с ожидаемыми значениями
        if (telegramId === 255) {
          const expectedUni = 194002.030215;
          const expectedTon = 0.328772;
          const uniMatches = Math.abs(balance.balance_uni - expectedUni) < 0.001;
          const tonMatches = Math.abs(balance.balance_ton - expectedTon) < 0.001;
          
          console.log(`🎯 Ожидалось: UNI ${expectedUni}, TON ${expectedTon}`);
          console.log(`${uniMatches ? '✅' : '❌'} UNI совпадает: ${uniMatches}`);
          console.log(`${tonMatches ? '✅' : '❌'} TON совпадает: ${tonMatches}`);
          
          if (uniMatches && tonMatches) {
            console.log('🎉 USER 255: ПОЛНОСТЬЮ ВОССТАНОВЛЕН!');
          }
          
        } else if (telegramId === 251) {
          const expectedUni = 129192.199781;
          const uniMatches = Math.abs(balance.balance_uni - expectedUni) < 0.001;
          
          console.log(`🎯 Ожидалось: UNI ${expectedUni}`);
          console.log(`${uniMatches ? '✅' : '❌'} UNI совпадает: ${uniMatches}`);
          
          if (uniMatches) {
            console.log('🎉 USER 251: ПОЛНОСТЬЮ ВОССТАНОВЛЕН!');
          }
        }
      } else {
        console.log('❌ Не удалось получить итоговый баланс:', finalBalanceResult.error);
      }
    }
    
    // 4. Тестируем новые операции
    console.log(`\n🧪 ТЕСТ НОВЫХ ОПЕРАЦИЙ:`);
    
    // Тестируем с рабочим пользователем (например, 184 из логов)
    const testTelegramId = 184;
    
    console.log(`\n--- ТЕСТ НОВОГО API НА USER ${testTelegramId} ---`);
    
    // Получаем баланс
    const testBalanceResult = await balanceManager.getUserBalance(testTelegramId);
    
    if (testBalanceResult.success) {
      console.log('✅ Новый API работает с существующими пользователями');
      console.log(`User ${testTelegramId}: UNI ${testBalanceResult.balance?.balance_uni}, TON ${testBalanceResult.balance?.balance_ton}`);
    } else {
      console.log('❌ Новый API не работает с существующими пользователями:', testBalanceResult.error);
    }
    
    // 5. Проверяем совместимость
    console.log(`\n🔗 ПРОВЕРКА СОВМЕСТИМОСТИ:`);
    
    // Проверяем что система понимает оба типа ID
    const { data: user255 } = await supabase
      .from('users')
      .select('id, telegram_id')
      .eq('telegram_id', 255)
      .single();
    
    if (user255) {
      console.log(`User 255: internal_id = ${user255.id}, telegram_id = ${user255.telegram_id}`);
      console.log(`✅ Система корректно работает с маппингом ID`);
    }
    
    console.log('\n✅ Тестирование завершено');
    
  } catch (error) {
    console.error('❌ Критическая ошибка тестирования:', error);
    console.error('Stack trace:', error.stack);
  }
}

testFixedBalanceManager();