/**
 * АНАЛИЗ ОРИГИНАЛЬНОЙ СИСТЕМЫ ОБНОВЛЕНИЯ БАЛАНСОВ
 * Восстанавливаем как все работало ДО внедрения telegram_id
 */

import { supabase } from './core/supabase.js';

async function analyzeOriginalBalanceSystem() {
  console.log('🔍 АНАЛИЗ ОРИГИНАЛЬНОЙ СИСТЕМЫ ОБНОВЛЕНИЯ БАЛАНСОВ');
  console.log('⏰ Время анализа:', new Date().toISOString());
  
  try {
    console.log('\n=== ОРИГИНАЛЬНАЯ СИСТЕМА (ДО ИЗМЕНЕНИЙ) ===');
    
    console.log('🏗️ АРХИТЕКТУРА ОБНОВЛЕНИЯ БАЛАНСОВ:');
    console.log('   1. TransactionService.updateUserBalance()');
    console.log('      - Вызывал BalanceManager.addBalance(user_id, amount_uni, amount_ton)');
    console.log('      - user_id передавался как internal_id из транзакции');
    console.log('');
    console.log('   2. BalanceManager.addBalance() - СТАРАЯ ВЕРСИЯ');
    console.log('      - Принимал user_id как internal_id');
    console.log('      - Обновлял баланс в БД по .eq("id", user_id)');
    console.log('      - НЕ использовал telegram_id');
    console.log('');
    console.log('   3. Другие компоненты:');
    console.log('      - UserRepository.updateBalance() - делегировал в BalanceManager');
    console.log('      - UserModel.updateBalance() - делегировал в BalanceManager');
    console.log('      - Все работали с internal_id');
    
    console.log('\n=== НОВАЯ СИСТЕМА (ПОСЛЕ ИЗМЕНЕНИЙ) ===');
    
    console.log('🔧 ИЗМЕНЕНИЯ В BALANCEMANAGER:');
    console.log('   1. BalanceManager.updateUserBalance()');
    console.log('      - ТЕПЕРЬ работает с telegram_id');
    console.log('      - Ищет пользователя по .eq("telegram_id", user_id)');
    console.log('      - НО TransactionService передает internal_id!');
    console.log('');
    console.log('   2. КРИТИЧЕСКАЯ ОШИБКА:');
    console.log('      - TransactionService передает internal_id (25, 227, etc)');
    console.log('      - BalanceManager ищет по telegram_id');  
    console.log('      - Не находит пользователя или находит неправильного!');
    
    // Проверяем конкретный пример
    console.log('\n=== ПРОВЕРКА КОНКРЕТНОГО ПРИМЕРА ===');
    
    // Берем недавнюю транзакцию User 25
    const { data: user25Transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (user25Transaction) {
      console.log('🎯 Анализ транзакции User 25:');
      console.log(`   Транзакция user_id: ${user25Transaction.user_id}`);
      console.log(`   Тип: ${user25Transaction.type}`);
      console.log(`   Сумма: ${user25Transaction.amount_uni || user25Transaction.amount_ton} ${user25Transaction.currency}`);
      
      // Что происходит при обновлении баланса
      console.log('\n🔄 Поток обновления баланса:');
      console.log(`   1. TransactionService.updateUserBalance(${user25Transaction.user_id}, ...)`)
      console.log(`   2. BalanceManager.addBalance(${user25Transaction.user_id}, ...)`)
      console.log(`   3. BalanceManager ищет пользователя по telegram_id=${user25Transaction.user_id}`)
      
      // Проверяем что найдет BalanceManager
      const { data: foundUser } = await supabase
        .from('users')
        .select('id, telegram_id, username, balance_uni, balance_ton')
        .eq('telegram_id', user25Transaction.user_id)
        .single();
      
      if (foundUser) {
        console.log(`   4. ✅ BalanceManager найдет пользователя:`);
        console.log(`      internal_id: ${foundUser.id}, telegram_id: ${foundUser.telegram_id}`);
        console.log(`      username: ${foundUser.username}`);
      } else {
        console.log(`   4. ❌ BalanceManager НЕ найдет пользователя!`);
        console.log(`      Нет пользователя с telegram_id=${user25Transaction.user_id}`);
      }
    }
    
    // Проверяем что должно быть в оригинальной системе
    console.log('\n=== ШТО ДОЛЖНО БЫТЬ В ОРИГИНАЛЬНОЙ СИСТЕМЕ ===');
    
    console.log('🎯 ПРАВИЛЬНЫЙ ПОТОК (как было раньше):');
    console.log('   1. Транзакция создается с user_id = internal_id пользователя');
    console.log('   2. TransactionService.updateUserBalance(internal_id, ...)');
    console.log('   3. BalanceManager.addBalance(internal_id, ...)');
    console.log('   4. BalanceManager обновляет по .eq("id", internal_id)');
    console.log('   5. Баланс обновляется успешно');
    
    console.log('\n❌ СЛОМАННЫЙ ПОТОК (что стало):');
    console.log('   1. Транзакция создается с user_id = telegram_id');
    console.log('   2. TransactionService.updateUserBalance(telegram_id, ...)');
    console.log('   3. BalanceManager.updateUserBalance() ищет по telegram_id');
    console.log('   4. Если есть дубликаты - не находит или находит неправильного');
    console.log('   5. Баланс НЕ обновляется');
    
    // Проверяем старые методы BalanceManager
    console.log('\n=== ПРОВЕРКА МЕТОДОВ BALANCEMANAGER ===');
    
    try {
      const { BalanceManager } = await import('./core/BalanceManager.js');
      const balanceManager = BalanceManager.getInstance();
      
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(balanceManager));
      console.log('📋 Доступные методы BalanceManager:');
      methods.forEach(method => {
        if (!method.startsWith('_') && method !== 'constructor') {
          console.log(`   - ${method}`);
        }
      });
      
    } catch (error) {
      console.log('❌ Ошибка загрузки BalanceManager:', error.message);
    }
    
    // ИТОГОВАЯ ДИАГНОСТИКА
    console.log('\n=== 🎯 ИТОГОВАЯ ДИАГНОСТИКА ===');
    
    console.log('🚨 НАЙДЕНА КРИТИЧЕСКАЯ ПРОБЛЕМА:');
    console.log('   BalanceManager был изменен для работы с telegram_id,');
    console.log('   но TransactionService продолжает передавать internal_id!');
    console.log('');
    console.log('💡 РЕШЕНИЕ:');
    console.log('   ЛИБО: Вернуть BalanceManager к работе с internal_id');
    console.log('   ЛИБО: Изменить TransactionService для передачи telegram_id');
    console.log('   ЛИБО: Создать универсальный поиск пользователей');
    console.log('');
    console.log('🎯 РЕКОМЕНДАЦИЯ:');
    console.log('   Добавить в BalanceManager универсальный поиск пользователя');
    console.log('   который работает и с internal_id и с telegram_id');
    
  } catch (error) {
    console.error('❌ Критическая ошибка анализа:', error);
    console.error('Stack:', error.stack);
  }
}

analyzeOriginalBalanceSystem();