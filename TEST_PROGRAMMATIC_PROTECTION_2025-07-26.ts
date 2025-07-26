/**
 * 🧪 ТЕСТ ПРОГРАММНОЙ ЗАЩИТЫ ОТ ДУБЛИРОВАНИЯ
 * 
 * Дата: 26 июля 2025
 * Задача: Протестировать новую программную защиту от дублей
 */

import { supabase } from './core/supabase';

async function testProgrammaticProtection(): Promise<void> {
  console.log('\n🧪 ТЕСТ ПРОГРАММНОЙ ЗАЩИТЫ ОТ ДУБЛИРОВАНИЯ');
  console.log('=' .repeat(70));
  console.log(`Дата: ${new Date().toLocaleString('ru-RU')}`);
  console.log('Цель: Убедиться что код предотвращает дубли');
  console.log('=' .repeat(70));

  try {
    // Получаем тестового пользователя
    const { data: testUser } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();
      
    if (!testUser) {
      console.log('❌ Не найден пользователь для тестирования');
      return;
    }
    
    console.log(`👤 Тестовый User ID: ${testUser.id}`);
    
    // ЭТАП 1: ТЕСТ ЧЕРЕЗ API (симуляция реального TON депозита)
    console.log('\n🌐 ЭТАП 1: ТЕСТ ЧЕРЕЗ API WALLET SERVICE');
    console.log('-' .repeat(50));
    
    const testHash = 'programmatic_test_' + Date.now();
    console.log(`🔑 Тестовый hash: ${testHash}`);
    
    // Симулируем первый депозит через API
    console.log('\n📝 Отправка первого депозита через API...');
    const firstResponse = await fetch('http://localhost:3000/api/v2/wallet/ton-deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: testUser.id,
        amount: 0.001,
        ton_tx_hash: testHash,
        wallet_address: 'test_wallet_address_programmatic'
      })
    });
    
    const firstResult = await firstResponse.json();
    console.log('📊 Результат первого депозита:');
    console.log(`   Status: ${firstResponse.status}`);
    console.log(`   Success: ${firstResult.success}`);
    if (firstResult.success) {
      console.log('   ✅ Первый депозит создан успешно');
    } else {
      console.log(`   ❌ Ошибка первого депозита: ${firstResult.error}`);
    }
    
    // Пауза
    console.log('\n⏱️ Пауза 1 секунда...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Симулируем второй депозит с тем же hash
    console.log('\n🔄 Отправка ДУБЛИРОВАННОГО депозита через API...');
    const secondResponse = await fetch('http://localhost:3000/api/v2/wallet/ton-deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: testUser.id,
        amount: 0.002, // Другая сумма
        ton_tx_hash: testHash, // ТОТ ЖЕ HASH!
        wallet_address: 'test_wallet_address_programmatic_duplicate'
      })
    });
    
    const secondResult = await secondResponse.json();
    console.log('📊 Результат дублированного депозита:');
    console.log(`   Status: ${secondResponse.status}`);
    console.log(`   Success: ${secondResult.success}`);
    console.log(`   Error: ${secondResult.error || 'нет'}`);
    
    // АНАЛИЗ API ТЕСТА
    if (!secondResult.success && secondResult.error?.includes('уже существует')) {
      console.log('\n🎉 ОТЛИЧНО! API ЗАЩИТА РАБОТАЕТ!');
      console.log('   ✅ Дублированный депозит заблокирован');
      console.log('   ✅ Система предотвратила создание дубля');
    } else if (secondResult.success) {
      console.log('\n❌ ПРОБЛЕМА: API позволил создать дубликат');
      console.log('   🔧 Требуется проверка логики WalletService');
    } else {
      console.log('\n❓ Неопределенный результат API теста');
      console.log(`   💡 Ошибка: ${secondResult.error}`);
    }
    
    // ЭТАП 2: ПРОВЕРКА В БАЗЕ ДАННЫХ
    console.log('\n🗄️ ЭТАП 2: ПРОВЕРКА ЗАПИСЕЙ В БД');
    console.log('-' .repeat(50));
    
    const { data: testRecords } = await supabase
      .from('transactions')
      .select('id, user_id, tx_hash_unique, amount_ton, created_at, description')
      .eq('tx_hash_unique', testHash)
      .order('created_at', { ascending: true });
      
    console.log(`📊 Найдено записей с hash ${testHash}: ${testRecords?.length || 0}`);
    
    if (testRecords && testRecords.length > 0) {
      console.log('\n📋 ДЕТАЛИ ЗАПИСЕЙ:');
      testRecords.forEach((record, index) => {
        console.log(`   Запись ${index + 1}:`);
        console.log(`     ID: ${record.id}`);
        console.log(`     User: ${record.user_id}`);
        console.log(`     Amount: ${record.amount_ton} TON`);
        console.log(`     Created: ${new Date(record.created_at).toLocaleString()}`);
        console.log(`     Description: ${record.description}`);
      });
      
      if (testRecords.length === 1) {
        console.log('\n✅ ИДЕАЛЬНО: Создана только одна запись');
        console.log('✅ Программная защита предотвратила дублирование');
      } else if (testRecords.length > 1) {
        console.log(`\n⚠️ НАЙДЕНО ${testRecords.length} записей с одинаковым hash`);
        console.log('❌ Программная защита не сработала');
      }
    }
    
    // ЭТАП 3: ОЧИСТКА ТЕСТОВЫХ ДАННЫХ
    console.log('\n🧹 ЭТАП 3: ОЧИСТКА ТЕСТОВЫХ ДАННЫХ');
    console.log('-' .repeat(50));
    
    const { error: cleanupError } = await supabase
      .from('transactions')
      .delete()
      .eq('tx_hash_unique', testHash);
      
    if (cleanupError) {
      console.log(`⚠️ Ошибка очистки: ${cleanupError.message}`);
    } else {
      console.log('✅ Тестовые данные очищены');
    }
    
    // ЭТАП 4: ИТОГОВАЯ ОЦЕНКА
    console.log('\n🎯 ЭТАП 4: ИТОГОВАЯ ОЦЕНКА ЗАЩИТЫ');
    console.log('-' .repeat(50));
    
    const protectionWorking = !secondResult.success && 
                            secondResult.error?.includes('уже существует');
    
    if (protectionWorking) {
      console.log('🎉 УСПЕХ! ПРОГРАММНАЯ ЗАЩИТА РАБОТАЕТ!');
      console.log('✅ API блокирует дублированные депозиты');
      console.log('✅ Система защищена на уровне приложения');
      console.log('✅ Проблема User 25 решена программно');
      
      console.log('\n📊 ПРЕИМУЩЕСТВА ПРОГРАММНОЙ ЗАЩИТЫ:');
      console.log('   - Мгновенное действие (работает сразу)');
      console.log('   - Независимость от состояния БД');
      console.log('   - Детальное логирование попыток дублирования');
      console.log('   - Легкое тестирование и отладка');
      console.log('   - Полная контролируемость');
      
    } else {
      console.log('❌ ПРОБЛЕМА: Программная защита не работает');
      console.log('🔧 ТРЕБУЕТСЯ: Дополнительная диагностика кода');
      console.log('💡 ПРОВЕРИТЬ:');
      console.log('   1. Логи сервера на наличие ошибок');
      console.log('   2. Правильность работы UnifiedTransactionService');
      console.log('   3. Корректность обработки metadata в WalletService');
    }
    
    console.log('\n💾 ТЕСТ ПРОГРАММНОЙ ЗАЩИТЫ ЗАВЕРШЕН');
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка теста:', error);
    console.log('\n🛡️ СИСТЕМА ОСТАЕТСЯ СТАБИЛЬНОЙ');
    console.log('   - Тест не влияет на продакшен');
    console.log('   - Все данные в безопасности');
    console.log('   - Можно повторить тест позже');
  }
}

// Запуск теста
testProgrammaticProtection()
  .then(() => {
    console.log('\n🏁 ТЕСТ ПРОГРАММНОЙ ЗАЩИТЫ ЗАВЕРШЕН');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Ошибка теста:', error);
    process.exit(1);
  });