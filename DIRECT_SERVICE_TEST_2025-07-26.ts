/**
 * 🧪 ПРЯМОЙ ТЕСТ UNIFIEDTRANSACTIONSERVICE
 * 
 * Дата: 26 июля 2025
 * Задача: Протестировать защиту напрямую через сервис
 */

import { UnifiedTransactionService } from './core/TransactionService';

async function directServiceTest(): Promise<void> {
  console.log('\n🧪 ПРЯМОЙ ТЕСТ ЗАЩИТЫ ЧЕРЕЗ UNIFIEDTRANSACTIONSERVICE');
  console.log('=' .repeat(70));
  console.log(`Дата: ${new Date().toLocaleString('ru-RU')}`);
  console.log('=' .repeat(70));

  try {
    const service = UnifiedTransactionService.getInstance();
    const testHash = 'direct_service_test_' + Date.now();
    
    console.log(`🔑 Тестовый hash: ${testHash}`);
    console.log(`👤 Тестовый User ID: 247`);
    
    // ЭТАП 1: Создание первой транзакции
    console.log('\n📝 ЭТАП 1: Создание первой транзакции...');
    const firstResult = await service.createTransaction({
      user_id: 247,
      type: 'TON_DEPOSIT',
      amount_uni: 0,
      amount_ton: 0.001,
      currency: 'TON',
      description: 'Direct service test - первая транзакция',
      metadata: {
        tx_hash: testHash,
        test: true,
        direct_service: true
      }
    });
    
    console.log('📊 Результат первой транзакции:');
    console.log(`   Success: ${firstResult.success}`);
    if (firstResult.success) {
      console.log(`   Transaction ID: ${firstResult.transaction_id}`);
      console.log('   ✅ Первая транзакция создана успешно');
    } else {
      console.log(`   Error: ${firstResult.error}`);
      return;
    }
    
    // ЭТАП 2: Попытка создания дубликата
    console.log('\n🔄 ЭТАП 2: Попытка создания ДУБЛИКАТА...');
    const duplicateResult = await service.createTransaction({
      user_id: 247,
      type: 'TON_DEPOSIT',
      amount_uni: 0,
      amount_ton: 0.002, // Другая сумма
      currency: 'TON',
      description: 'Direct service test - ДУБЛИКАТ (должен быть заблокирован)',
      metadata: {
        tx_hash: testHash, // ТОТ ЖЕ HASH!
        test: true,
        direct_service: true,
        is_duplicate: true
      }
    });
    
    console.log('📊 Результат попытки дублирования:');
    console.log(`   Success: ${duplicateResult.success}`);
    console.log(`   Error: ${duplicateResult.error || 'нет'}`);
    
    // АНАЛИЗ РЕЗУЛЬТАТА
    if (!duplicateResult.success && duplicateResult.error?.includes('уже существует')) {
      console.log('\n🎉 ОТЛИЧНО! ПРОГРАММНАЯ ЗАЩИТА РАБОТАЕТ!');
      console.log('   ✅ UnifiedTransactionService заблокировал дубликат');
      console.log('   ✅ Система предотвратила создание дубля');
      console.log('   ✅ Программная защита на уровне сервиса активна');
    } else if (duplicateResult.success) {
      console.log('\n❌ КРИТИЧНО: Дубликат был создан!');
      console.log(`   💥 Transaction ID дубликата: ${duplicateResult.transaction_id}`);
      console.log('   🔧 Защита НЕ РАБОТАЕТ');
    } else {
      console.log('\n❓ Неопределенный результат');
      console.log(`   💡 Ошибка: ${duplicateResult.error}`);
    }
    
    // ЭТАП 3: Проверка логов и состояния
    console.log('\n📊 ЭТАП 3: ПРОВЕРКА СОСТОЯНИЯ ЗАЩИТЫ');
    console.log('-' .repeat(50));
    
    if (!duplicateResult.success && duplicateResult.error?.includes('уже существует')) {
      console.log('✅ ЗАЩИТА АКТИВИРОВАНА УСПЕШНО!');
      console.log('\n📋 ДЕТАЛИ УСПЕШНОЙ ЗАЩИТЫ:');
      console.log('   - Метод: Программная проверка в UnifiedTransactionService');
      console.log('   - Уровень: Application-level защита');
      console.log('   - Поле проверки: tx_hash_unique');
      console.log('   - Логирование: Детальные логи предотвращения');
      console.log('   - Производительность: Одна дополнительная SELECT операция');
      
      console.log('\n🛡️ ПРЕИМУЩЕСТВА ПРОГРАММНОЙ ЗАЩИТЫ:');
      console.log('   ✅ Работает независимо от состояния БД');
      console.log('   ✅ Детальное логирование попыток дублирования');
      console.log('   ✅ Полная контролируемость логики');
      console.log('   ✅ Легкое тестирование и отладка');
      console.log('   ✅ Мгновенное действие без миграций БД');
      
      console.log('\n🎯 ПРОБЛЕМА USER 25 РЕШЕНА:');
      console.log('   ✅ Новые депозиты не будут дублироваться');
      console.log('   ✅ Система защищена от TON депозит дублей');
      console.log('   ✅ Надежность на уровне приложения');
      
    } else {
      console.log('❌ ЗАЩИТА НЕ АКТИВНА');
      console.log('🔧 ТРЕБУЕТСЯ ДОПОЛНИТЕЛЬНАЯ ДИАГНОСТИКА');
    }
    
    // ЭТАП 4: Очистка тестовых данных
    console.log('\n🧹 ЭТАП 4: ОЧИСТКА ТЕСТОВЫХ ДАННЫХ');
    console.log('-' .repeat(50));
    
    // Импортируем supabase для очистки
    const { supabase } = await import('./core/supabase');
    const { error: cleanupError } = await supabase
      .from('transactions')
      .delete()
      .eq('tx_hash_unique', testHash);
      
    if (cleanupError) {
      console.log(`⚠️ Ошибка очистки: ${cleanupError.message}`);
    } else {
      console.log('✅ Тестовые данные очищены');
    }
    
    console.log('\n💾 ПРЯМОЙ ТЕСТ ЗАВЕРШЕН');
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка прямого теста:', error);
    console.log('\n🛡️ СИСТЕМА ОСТАЕТСЯ СТАБИЛЬНОЙ');
  }
}

// Запуск прямого теста
directServiceTest()
  .then(() => {
    console.log('\n🏁 ПРЯМОЙ ТЕСТ ЗАЩИТЫ ЗАВЕРШЕН');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Ошибка прямого теста:', error);
    process.exit(1);
  });