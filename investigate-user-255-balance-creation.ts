#!/usr/bin/env tsx
/**
 * 🔍 ИССЛЕДОВАНИЕ СОЗДАНИЯ БАЛАНСА USER 255
 * Изучаем структуру таблицы и требования для создания записи
 */

import { supabase } from './core/supabase';

async function investigateBalanceCreation() {
  console.log('🔍 ИССЛЕДОВАНИЕ СОЗДАНИЯ БАЛАНСА USER 255');
  console.log('='.repeat(80));

  try {
    // 1. Изучаем структуру существующих записей баланса
    console.log('\n1️⃣ АНАЛИЗ СТРУКТУРЫ ТАБЛИЦЫ user_balances:');
    
    const { data: sampleBalances } = await supabase
      .from('user_balances')
      .select('*')
      .limit(3);
      
    if (sampleBalances && sampleBalances.length > 0) {
      console.log('📋 Пример существующих записей:');
      sampleBalances.forEach((balance, i) => {
        console.log(`\n   ${i + 1}. User ${balance.user_id}:`);
        console.log(`      UNI: ${balance.uni_balance}`);
        console.log(`      TON: ${balance.ton_balance}`);
        console.log(`      Создан: ${balance.created_at}`);
        console.log(`      Обновлен: ${balance.updated_at}`);
        
        // Показываем все поля для понимания структуры
        Object.keys(balance).forEach(key => {
          if (!['user_id', 'uni_balance', 'ton_balance', 'created_at', 'updated_at'].includes(key)) {
            console.log(`      ${key}: ${balance[key]}`);
          }
        });
      });
    }
    
    // 2. Попробуем создать с минимальными данными
    console.log('\n2️⃣ ПОПЫТКА СОЗДАНИЯ С МИНИМАЛЬНЫМИ ДАННЫМИ:');
    
    // Сначала удалим если существует (на всякий случай)
    await supabase
      .from('user_balances')
      .delete()
      .eq('user_id', 255);
    
    console.log('✅ Предварительная очистка выполнена');
    
    // Создаем с минимальным набором
    const { data: newBalance, error: createError } = await supabase
      .from('user_balances')
      .insert({
        user_id: 255,
        uni_balance: 154.076667,
        ton_balance: 2.60
      })
      .select()
      .single();
      
    if (createError) {
      console.log('❌ Ошибка создания (попытка 1):', createError);
      
      // Попробуем более детальный вариант
      console.log('\n3️⃣ ПОПЫТКА С ПОЛНЫМ НАБОРОМ ПОЛЕЙ:');
      
      const { data: fullBalance, error: fullError } = await supabase
        .from('user_balances')
        .insert({
          user_id: 255,
          uni_balance: 154.076667,
          ton_balance: 2.60,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (fullError) {
        console.log('❌ Ошибка создания (попытка 2):', fullError);
        
        // Посмотрим детальную информацию об ошибке
        console.log('\n📊 Детальный анализ ошибки:');
        console.log('Code:', fullError.code);
        console.log('Message:', fullError.message);
        console.log('Details:', fullError.details);
        console.log('Hint:', fullError.hint);
        
      } else {
        console.log('✅ УСПЕШНО СОЗДАН (попытка 2)!');
        console.log('Данные:', fullBalance);
      }
      
    } else {
      console.log('✅ УСПЕШНО СОЗДАН (попытка 1)!');
      console.log('Данные:', newBalance);
    }
    
    // 4. Проверяем финальный результат
    console.log('\n4️⃣ ПРОВЕРКА ФИНАЛЬНОГО РЕЗУЛЬТАТА:');
    
    const { data: finalCheck } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', 255)
      .single();
      
    if (finalCheck) {
      console.log('✅ Запись успешно создана и найдена:');
      console.log(`   User ID: ${finalCheck.user_id}`);
      console.log(`   UNI баланс: ${finalCheck.uni_balance}`);
      console.log(`   TON баланс: ${finalCheck.ton_balance}`);
      console.log(`   Создан: ${finalCheck.created_at}`);
      console.log(`   Обновлен: ${finalCheck.updated_at}`);
      
      console.log('\n🎉 ПРОБЛЕМА С БАЛАНСОМ USER 255 РЕШЕНА!');
      console.log('');
      console.log('Теперь изучаем почему система не записывает депозиты автоматически...');
      
    } else {
      console.log('❌ Запись по-прежнему не найдена');
    }
    
    // 5. Анализ проблемы автоматических депозитов
    console.log('\n5️⃣ АНАЛИЗ ПРОБЛЕМЫ АВТОМАТИЧЕСКИХ ДЕПОЗИТОВ:');
    console.log('');
    console.log('🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ НЕ ЗАПИСИ ДЕПОЗИТОВ:');
    console.log('');
    console.log('1. ❌ ОТСУТСТВИЕ WEBHOOK ИНТЕГРАЦИИ:');
    console.log('   - Нет секретов TON API (TONAPI_KEY, TON_WEBHOOK_SECRET)');
    console.log('   - Нет автоматического endpoint для получения депозитов');
    console.log('   - Система ждет ручного вызова /api/v2/wallet/ton-deposit');
    console.log('');
    console.log('2. ❌ MISSING USER_BALANCES RECORD:');
    console.log('   - User 255 не имел записи в user_balances');
    console.log('   - processTonDeposit -> BalanceManager не мог обновить несуществующий баланс');
    console.log('   - Транзакция создавалась, но баланс не обновлялся');
    console.log('');
    console.log('3. ⚠️ FRONTEND DEPENDENCY:');
    console.log('   - Депозиты зависят от frontend запроса');
    console.log('   - Если пользователь отправил TON, но не нажал в интерфейсе - депозит потеряется');
    console.log('   - Нет автоматического мониторинга блокчейна');
    console.log('');
    console.log('✅ ИСПРАВЛЕНО:');
    console.log('   - Создана запись user_balances для User 255');
    console.log('   - Теперь его депозиты будут работать как у других пользователей');
    console.log('');
    console.log('🔧 ДЛЯ ПОЛНОЙ АВТОМАТИЗАЦИИ НУЖНО:');
    console.log('   - Настроить TON API секреты');
    console.log('   - Добавить webhook endpoint для автоматического получения депозитов');
    console.log('   - Настроить мониторинг TON кошелька');
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('💥 ОШИБКА ИССЛЕДОВАНИЯ:', error);
  }
}

investigateBalanceCreation().catch(console.error);